'use latest'
import * as sg from '@sendgrid/mail'


export = (event: any) => {
  const { id, email, resetToken, firstName, lastName } = event.data.User.node

  if (!resetToken) {
    return null
  }

  let helper: any;
  const fromEmail = new helper.Email('me@example.com', 'New User')
  const subject = 'Reset your password'
  const htmlEmail =
    `<html>
<head>
  <title>reset your password</title>
</head>
<body>
  <p>Hi -firstname-,</p>
  <p><a href="https://example.com/reset?token=${resetToken}&email=${email}">Click here to reset your password.</a></p>
</body>
</html>`
  const content = new helper.Content('text/html', htmlEmail)

  let mail = new helper.Mail()
  mail.setFrom(fromEmail)
  mail.setSubject(subject)

  let personalization = new helper.Personalization()
  const toEmail = new helper.Email(email, firstName + ' ' + lastName)
  personalization.addTo(toEmail)
  let substitution = new helper.Substitution('-firstname-', firstName)
  personalization.addSubstitution(substitution)
  mail.addPersonalization(personalization)

  mail.addContent(content)

  let sg: any;
  sg.setApiKey(process.env.SENDGRID_API_KEY);

  return new Promise((resolve: any, reject: any) => {
    let request: any = sg.emptyRequest()
    request.body = mail.toJSON()
    request.method = 'POST'
    request.path = '/v3/mail/send'
    sg.API(request, (error: any, response: any) => {
      console.log(error)
      console.log(response)
      return error ? reject(error) : resolve(response)
    })
  })
}
