import { fromEvent } from 'graphcool-lib';
import cryptoString = require('crypto-random-string');
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

const passwordResetEmail = async (event: any) => {

  const { email } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  function generateResetToken() {
    let cryptoRandomString: any = cryptoString(20);
    return cryptoRandomString
  }

  function generateExpiryDate() {
    const now = new Date();
    const nowDate: any = new Date(now.getTime() + 3600000).toISOString()
    return nowDate
  }

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
          resetExpires
        }
      }
    `)
  }
  return await getGraphcoolUser(email)
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        return toggleReset(graphcoolUser.id);
      }
    })
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        const resetToken: any = graphcoolUser.updateUser.resetToken
        const resetExpire: any = graphcoolUser.updateUser.resetExpires
        const newexpire = resetExpire.toLocaleString()
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Reset Password',
          text: `Click the following link to reset the password: ${process.env.CLIENT_URL}/reset_password?token=${resetToken}
           and link will expire in ${(newexpire)}`
        };
        return sgMail.send(sendMail)
      }
    })
    .then((id: any) => {
      let newID = { data: { id: 'Request for Reset Password is sent' } }
      return newID
    })
    .catch((error: any) => {
      return error
    })
}
export default passwordResetEmail;
