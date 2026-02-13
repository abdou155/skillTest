const { app } = require("./app.js");
const { env, dbHealthCheck, initDbLogging } = require("./config");

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);                                                                                                                                                

  initDbLogging();
  dbHealthCheck()
    .then(() => console.log("Database connection: OK"))
    .catch((error) => console.error("Database connection: FAILED", error));
});
