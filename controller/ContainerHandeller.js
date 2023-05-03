const express = require("express");
const router = express.Router();

const Docker = require("dockerode");
const docker = new Docker();

const net = require("net");

router.post("/", async (req, res) => {
  if (req.body.command == "start") {
    console.log(`Spinning up a container for ${req.user.userObj._id}`);
    const containerOptions = {
      Image: "ubuntu",
      name: `${req.user.userObj._id}`,
      Cmd: [
        "bash",
        "-c",
        "apt-get update && apt-get install -y openssh-server && " +
          'echo "root:password" | chpasswd && ' +
          `useradd -ms /bin/bash ${req.user.userObj.email} && ` +
          `echo "${req.user.userObj.email}:password" | chpasswd && ` +
          "service ssh start && " +
          "sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && " +
          "service ssh restart && " +
          "tail -f /dev/null",
      ],
      ExposedPorts: {
        "22/tcp": {},
      },
      HostConfig: {
        PortBindings: {
          "22/tcp": [{ HostPort: "" }],
        },
        Memory: 256 * 1024 * 1024,
        MemorySwap: -1,
      },
      Tty: true,
      OpenStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    };

    const checkPort = async (port) => {
      return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(port, () => {
          server.close(() => {
            resolve(port);
          });
        });
      });
    };

    const assignPort = async () => {
      for (let port = 5000; port <= 6000; port++) {
        try {
          const result = await checkPort(port.toString());
          return result;
        } catch (error) {
          continue;
        }
      }
      throw new Error("All ports between 5000 - 6000 are in use");
    };

    const assignedPort = await assignPort();
    containerOptions.HostConfig.PortBindings["22/tcp"][0].HostPort =
      assignedPort.toString();

    docker.createContainer(containerOptions, function (err, container) {
      if (err) {
        console.error(err);
      } else {
        container.start(function (err, data) {
          if (err) {
            console.error(err);
          } else {
            container.inspect(function (err, data) {
              if (err) {
                console.error(err);
              } else {
                console.log(data.State.Status);
                res.send({
                  domain: `${process.env.host}`,
                  port: assignedPort.toString(),
                  username: req.user.userObj.email,
                  password: "password",
                });
              }
            });
          }
        });
      }
    });
  }
  if (req.body.command == "delete") {
    console.log(`Deleting container for user ${req.user.userObj._id}`);

    const container = docker.getContainer(`${req.user.userObj._id}`);

    container.stop(function (err, data) {
      if (err) {
        console.error(err);
      } else {
        console.log("Container stopped successfully");
        container.remove(function (err, data) {
          if (err) {
            console.error(err);
          } else {
            console.log("Container deleted successfully");
            res.send({ delete: "success" });
          }
        });
      }
    });
  }
});

router.get("/stats", async (req, res) => {
  var container = docker.getContainer(`${req.user.userObj._id}`);

  container.stats({ stream: false }, function (err, stats) {
    if (err) {
      // console.error(err);
      res.status(500).send(err);
    } else {
      const { memory_stats, cpu_stats } = stats;
      const ram = Math.floor(memory_stats.usage / 1000000);
      const cpuPercent = (
        ((cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage) /
          (cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage)) *
        100
      ).toFixed(2);

      // get container options to retrieve the assigned port
      container.inspect(function (err, data) {
        if (err) {
          console.error(err);
        } else {
          const assignedPort =
            data.HostConfig.PortBindings["22/tcp"][0].HostPort;
          res.send({
            ram: ram + " MB",
            cpu: cpuPercent + "%",
            uptime: "N/A",
            domain: `${process.env.host}`,
            port: assignedPort.toString(),
            username: req.user.userObj.email,
            password: "password",
          });
        }
      });
    }
  });
});

module.exports = router;
