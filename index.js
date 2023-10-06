import express from "express";
import { emailFormat, verifyEmailFormat } from "./functions/verifyFormat.js";
import { resolveMxRecords } from "./functions/resolveMx.js";
import { testInboxOnServer } from "./functions/testInbox.js";
import { randomBytes } from "crypto";

const PORT = 5000;
const app = express();
app.use(express.json());

// functions

app.get("/", (req, res) => {
  res.send("See our documatation on www.rudygenave.com");
});

app.post("/api/validate", async (req, res, next) => {
  let email = req.query.email;

  if (!req.query.email) {
    res.status(400).json({ success: false, error: "missing email" });
    return next();
  }

  console.log(req.query.email);

  // console.log("Email Verify", emailFormat(req.query.email));

  const emailFormatIsValid = emailFormat(req.query.email);
  if (!emailFormatIsValid) {
    res.status(400).json({ success: false, error: "email format is invalid" });
    return next();
  }

  const [, domain] = String(req.query.email).split("@");
  console.log(domain);
  const mxRecords = await resolveMxRecords(domain);
  const sortedMxRecords = mxRecords.sort((a, b) => a.priority - b.priority);

  let smtpResult = {
    connection_succeeded: false,
    inbox_exists: false,
  };
  let hostIndex = 0;

  while (hostIndex < sortedMxRecords.length) {
    try {
      smtpResult = await testInboxOnServer(
        sortedMxRecords[hostIndex].exchange,
        req.query.email
      );
      if (!smtpResult.connection_succeeded) {
        hostIndex++;
      } else {
        break;
      }
    } catch (error) {
      console.error(error);
    }
  }

  let usesCatchAll = false;
  try {
    const testCatchAll = await testInboxOnServer(
      sortedMxRecords[hostIndex].exchange,
      `${randomBytes(20).toString()}@${domain}`
    );
    usesCatchAll = testCatchAll.inbox_exists;
  } catch (error) {
    console.error(error);
  }

  let success = false;

  if (emailFormatIsValid && smtpResult.connection_succeeded) {
    success = true;
  }

  return res.status(200).json({
    success: success,
    result: {
      email: email,
      email_format_is_valid: emailFormatIsValid,
      user: email.split("@")[0],
      domain: email.split("@")[1],
      uses_catch_all: usesCatchAll,
      ...smtpResult,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
