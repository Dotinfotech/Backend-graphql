import { fromEvent } from 'graphcool-lib';
import * as randomString from 'randomstring';
import * as sgMail from '@sendgrid/mail'
import * as dotenv from "dotenv";
dotenv.config();
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

export = function (event) {
  const email = event.data.email
  // const resetToken = event.data.resetToken
  // const resetExpires = event.data.resetExpires
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  // function randomString(length) {
  //   let chars: any = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  //   var result: any = '';
  //   for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  //   return result;
  // }

  function generateResetToken() {
    return randomString.generate(20).toString('hex');
  }

  function generateExpiryDate() {
    const now = new Date()
    return new Date(now.getTime() + 3600000).toISOString()
  }

  function getGraphcoolUser(email) {
    return api.request(`
    query {
      User(email: "${email}"){
        id
        email
        resetToken
      }
    }`)
      .then((userQueryResult: any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error)
        } else {
          return userQueryResult.User
        }
      })
  }

  function toggleReset(graphcoolUserId: any) {
    return api.request(`
      mutation {
        updateUser(
          id: "${graphcoolUserId}",
          resetToken: "${generateResetToken()}",
          resetExpires: "${generateExpiryDate()}"
        ) {
          id
          resetToken
        }
      }
    `)
    // const resetToken = { resetToken }
    // return api.request<{ PasswordResetToken: resetToken }>(mutation, resetToken)
    //   .then(r => r.PasswordResetToken.resetToken)
  }

  return getGraphcoolUser(email)
    .then((graphcoolUser) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Reset Password',
          text: `Click the following link to reset the password: ${process.env.CLIENT_URL}/reset_password?token= ${generateResetToken}  and expiry DateTime ${generateExpiryDate}`
        };
        sgMail.send(sendMail);
        return toggleReset(graphcoolUser.id);
      }
    })
    .then((response: any) => {
      const id = response.updateUser.id
      return { data: { id } }
    })
    .catch((error) => {
      console.log(error)

      return { error: 'An unexpected error occured.' }
    })
}
