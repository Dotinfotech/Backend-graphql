import { fromEvent } from 'graphcool-lib';
import cryptoString = require('crypto-random-string');
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';
import * as moment from 'moment';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

const passwordResetEmail = async (event: any) => {

  const { email } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  function generateResetToken() {
    // let test = cryptoString(20)
    let cryptoRandomString: any = cryptoString(20);
    return cryptoRandomString
  }

  function generateExpiryDate() {
    const now = new Date();
    const nowDate = new Date(now.getTime() + 3600000).toISOString()
    return nowDate
  }

  function dateFormat(date: any) {
    let formatDate = moment(date).format('llll');
    return formatDate
  }

  const getGraphcoolUser = async function getGraphcoolUser(email: any) {
    await api.request(`
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

  const toggleReset = async function toggleReset(graphcoolUserId: any) {
    await api.request(`
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
  await getGraphcoolUser(email)
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        let id = toggleReset(graphcoolUser.id);
        return id
      }
    })
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        const resetToken = graphcoolUser.updateUser.resetToken;
        const resetExpire = graphcoolUser.updateUser.resetExpires;
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Reset Password',
          text: `Click the following link to reset the password: ${process.env.CLIENT_URL}/reset_password?token=${resetToken} and link will expire in ${dateFormat(resetExpire)}`
        };
        let sgMailSend = sgMail.send(sendMail);
        return sgMailSend
      }
    })
    .then((response: any) => {
      const emailID = response.updateUser.email
      return { data: { emailID } }
    })
    .catch((error) => {
      console.log(error)
      return { error: 'An unexpected error occured.' }
    })
}
export default passwordResetEmail;