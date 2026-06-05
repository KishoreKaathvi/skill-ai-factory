import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export class Notifier {
  static async sendEmail(to: string, subject: string, html: string) {
    if (!resend) {
      console.log(`[Notifier Email (Placeholder)] To: ${to}, Subject: ${subject}`)
      return
    }

    try {
      await resend.emails.send({
        from: 'Skill AI Factory <noreply@skill-ai-factory.com>',
        to,
        subject,
        html,
      })
    } catch (error) {
      console.error('Error sending email via Resend:', error)
    }
  }

  static async sendSlackWebhook(message: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      console.log(`[Notifier Slack (Placeholder)] Message: ${message}`)
      return
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
    } catch (error) {
      console.error('Error sending Slack webhook:', error)
    }
  }

  static async notifyFailure(skillName: string, orgName: string, errorSnippet: string) {
    const subject = `ALERT: Skill "${skillName}" Execution Regression`
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #e63946;">Skill Regression Warning</h2>
        <p>An execution log for the skill <strong>${skillName}</strong> in organization <strong>${orgName}</strong> was rated negatively by a user or failed.</p>
        <p><strong>Telemetry Error Snippet:</strong></p>
        <pre style="background: #f1f1f1; padding: 10px; border-radius: 4px; overflow-x: auto;">${errorSnippet}</pre>
        <p style="margin-top: 20px;">
          <a href="http://localhost:3000/dashboard/logs" style="background: #9d4edd; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Logs Dashboard
          </a>
        </p>
      </div>
    `
    
    await this.sendSlackWebhook(`🚨 ALERT: Skill "${skillName}" in ${orgName} failed execution. Telemetry: "${errorSnippet}".`)
    // If we have targeted users, we can call: await this.sendEmail(email, subject, html)
  }
}
