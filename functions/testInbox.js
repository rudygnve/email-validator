import net from "net";

const SMTPStageNames = {
  CHECK_CONNECTION_ESTABLISHED: "CHECK_CONNECTION_ESTABLISHED",
  SEND_EHLO: "SEND_EHLO",
  SEND_MAIL_FROM: "SEND_MAIL_FROM",
  SEND_RECIPIENT_TO: "SEND_RECIPIENT_TO",
};

export const testInboxOnServer = async (smtpHostname, emailInbox) => {
  return new Promise((resolve, reject) => {
    const result = {
      connection_succeeded: false,
      inbox_exists: false,
    };

    const socket = net.createConnection(25, smtpHostname);
    let currentStageName = SMTPStageNames.CHECK_CONNECTION_ESTABLISHED;

    socket.on("data", (data) => {
      const response = data.toString("utf-8");
      console.log("<---" + response);

      switch (currentStageName) {
        case SMTPStageNames.CHECK_CONNECTION_ESTABLISHED: {
          const expectedReplyCode = "220";
          const nextStageName = SMTPStageNames.SEND_EHLO;
          const command = `EHLO mail.example.org\r\n`;

          if (!response.startsWith(expectedReplyCode)) {
            console.error(response);
            socket.end();
            return resolve(result);
          }

          result.connection_succeeded = true;

          socket.write(command, () => {
            console.log("--->" + command);
            currentStageName = nextStageName;
          });

          break;
        }

        case SMTPStageNames.SEND_EHLO: {
          const expectedReplyCode = "250";
          const nextStageName = SMTPStageNames.SEND_MAIL_FROM;
          const command = `MAIL FROM:<name@example.org>\r\n`;

          if (!response.startsWith(expectedReplyCode)) {
            console.error(response);
            socket.end();
            return resolve(result);
          }

          socket.write(command, () => {
            console.log("--->" + command);
            currentStageName = nextStageName;
          });

          break;
        }

        case SMTPStageNames.SEND_MAIL_FROM: {
          const expectedReplyCode = "250";
          const nextStageName = SMTPStageNames.SEND_RECIPIENT_TO;
          const command = `RCPT TO:<${emailInbox}>\r\n`;

          if (!response.startsWith(expectedReplyCode)) {
            console.error(response);
            socket.end();
            return resolve(result);
          }

          socket.write(command, () => {
            console.log("--->" + command);
            currentStageName = nextStageName;
          });

          break;
        }

        case SMTPStageNames.SEND_RECIPIENT_TO: {
          const expectedReplyCode = "250";
          const command = `QUIT\r\n`;

          if (!response.startsWith(expectedReplyCode)) {
            console.error(response);
            socket.end();
            return resolve(result);
          }

          result.inbox_exists = true;

          socket.write(command, () => {
            console.log("--->" + command);
            socket.end();
            return resolve(result);
          });
        }
      }
    });

    socket.on("error", (err) => {
      console.error(err);
      reject(err);
    });

    socket.on("connect", () => {
      console.log("Connected to: " + smtpHostname);
    });
  });
};
