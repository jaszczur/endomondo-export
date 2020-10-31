require("cross-fetch/polyfill");
const fs = require("fs/promises");
const { constants: fsConstants } = require("fs");
const { Api } = require("endomondo-api-handler");
const { DateTime } = require("luxon");

const api = new Api();

const fileExists = async (name) => {
  try {
    await fs.access(name, fsConstants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const exportWorkouts = async ({ before, login, password }) => {
  if (!login || !password) throw new Error("Invalid parameters");

  console.log("Logging in");
  await api.login(login, password);

  const filter = before
    ? {
        before: DateTime.fromISO(`${before}T00:00:00.000`),
      }
    : {};

  const dirName = `${login}-workouts`;
  if (!(await fileExists(dirName))) {
    await fs.mkdir(dirName);
  }

  console.log("Downloading workouts to", dirName);

  await api.processWorkouts(filter, async (workout) => {
    console.log(workout.toString());
    if (workout.hasGPSData()) {
      const workoutDate = workout.getStart().toFormat("yyyy-LL-dd");
      const file = `${dirName}/${workoutDate}-${workout.getId()}.gpx`;

      if (await fileExists(file)) {
        console.log(`Skipping, because file already exists ${file}`);
      } else {
        console.log(`Saving to ${file}`);
        const gpxData = await api.getWorkoutGpx(workout.getId());
        await fs.writeFile(file, gpxData, "utf8");
      }
    }
  });
};

if (process.argv.length < 5) {
  console.log(
    "Provide beforeDate username and password. Will download GPX files for workouts before given date"
  );
  console.log("example usage: 2019-05-16 user@gmail.com password123");
  process.exit(1);
}

(async () => {
  try {
    await exportWorkouts({
      before: process.argv[2],
      login: process.argv[3],
      password: process.argv[4],
    });
  } catch (e) {
    console.log(e);
  }
})();
