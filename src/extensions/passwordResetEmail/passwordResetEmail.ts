import { fromEvent } from 'graphcool-lib';
import * as randomString from 'randomstring';
import * as cryptoString from 'crypto-random-string';
import * as sgMail from '@sendgrid/mail'
import * as dotenv from "dotenv";

dotenv.config();
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

export = function (event) {
  const {email, resetToken, resetExpires} = event.data
  // const resetToken = event.data.resetToken
  // const resetExpire = event.data.resetExpires
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  function generateResetToken() {
    return cryptoString(20).toString('hex');
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
  }
  
  return getGraphcoolUser(email)
    .then((graphcoolUser) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        return toggleReset(graphcoolUser.id);
      }
    })
    .then((graphcoolUser) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        // const resetToken1 = event.data.resetToken
        // const resetExpire1 = event.data.resetExpire
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Reset Password',
          text: `Click the following link to reset the password: ${process.env.CLIENT_URL}/reset_password?token=${resetToken} and link will expire in ${resetExpires}`
        };
        return sgMail.send(sendMail);
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
