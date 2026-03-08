import crypto from "crypto"

export function verifyGithubWebhook(req, res, buf) {

  const signature = req.headers["x-hub-signature-256"]

  if (!signature) {
    throw new Error("Missing GitHub signature")
  }

  const hmac = crypto.createHmac(
    "sha256",
    process.env.GITHUB_WEBHOOK_SECRET
  )

  const digest = "sha256=" + hmac.update(buf).digest("hex")

  if (signature !== digest) {
    throw new Error("Invalid webhook signature")
  }

}