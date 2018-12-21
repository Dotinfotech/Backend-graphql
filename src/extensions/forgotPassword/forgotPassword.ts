// Importing libraries
import { fromEvent } from 'graphcool-lib';
import cryptoString = require('crypto-random-string');
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

// Main Export Function 
const passwordResetEmail = async (event: any) => {

  // Retrieve payload from event
  const { email,resetToken, resetExpires } = event.data

  // Graphcool-Lib Event and API
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  // Generate ResetToken Function
  function generateResetToken() {
    let cryptoRandomString: any = cryptoString(20);
    return cryptoRandomString
  }

  // Generate ExpiryDate Function
  function generateExpiryDate() {
    const now = new Date();
    const nowDate: any = new Date(now.getTime() + 3600000).toISOString()
    return nowDate
  }

  // FetchUser Function with Email
  const getGraphcoolUser = async (email: any) => {
    return await api.request(`
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

  var tokenReset = generateResetToken();
  var tokenExpiry = generateExpiryDate();
  //Reset Function for ResetToken, ExpiryDate
  function toggleReset(graphcoolUserId: any) {
    return api.request(`
      mutation {
        updateUser(
          id: "${graphcoolUserId}",
          resetToken: "${tokenReset}",
          resetExpires: "${tokenExpiry}"
        ) {
          id
          resetToken
          resetExpires
        }
      }
    `)
  }

  return await getGraphcoolUser(email)
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject("User doesn't exists")
      } else {
        return toggleReset(graphcoolUser.id);
      }
    })
    // Sending Mail confirmation for account reset password 
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject("User doesn't exists")
      } else {
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Reset Password',
          text: `Click the following link to reset the password: ${process.env.CLIENT_URL}/reset_password?token=${tokenReset}
           and link will expire in ${(tokenExpiry)}`
        };
        return sgMail.send(sendMail)
      }
    })
    .then((response: any) => {
      let tokenData = { data: { message: 'Forgot Password Email Sent', resetToken: tokenReset } }
      return tokenData
    })
    .catch((error: any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      throw { Error: 'An error occurred' }
    })
}
// Exporting Main Function
export default passwordResetEmail;
