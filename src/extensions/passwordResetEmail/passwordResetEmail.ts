import { fromEvent } from 'graphcool-lib';
import cryptoString = require('crypto-random-string');
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';
import * as moment from 'moment';
import { formatDate } from 'tough-cookie';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

const passwordResetEmail = async (event: any) => {

  const { email } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  function generateResetToken() {
    let cryptoRandomString: any = cryptoString(20);
    console.log('crypt string', cryptoRandomString);
    return cryptoRandomString
  }

  function generateExpiryDate() {
    const now = new Date();
    const nowDate: any = new Date(now.getTime() + 3600000).toISOString()
    console.log('ex date', nowDate)
    return nowDate
  }

  function dateFormat(date: any) {
    let formatDate = moment(date).endOf(date).fromNow();
    return formatDate
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

  const toggleReset = async (graphcoolUserId: any) => {
    return await api.request(`
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
      if (graphcoolUser !== null) {
        let id: any = toggleReset(graphcoolUser.id);
        console.log('gc id ', id)
        return id
      } else {
        return Promise.reject('Invalid Credentials')
      }
    })
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials')
      } else {
        const resetToken: any = graphcoolUser.updateUser.resetToken
        const resetExpire: any = graphcoolUser.updateUser.resetExpires
        console.log('Reset Token ', resetToken)
        console.log('Reset Expire ', dateFormat(resetExpire))
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Reset Password',
          text: `Click the following link to reset the password: ${process.env.CLIENT_URL}/reset_password?token=${resetToken}
           and link will expire in ${dateFormat(resetExpire)}`
        };
        let sgMailSend: any = sgMail.send(sendMail);
        console.log('mail data ',sgMailSend)
        return sgMailSend
      }
    })
    .then((response: any) => {
      const newId: any = response.graphcoolUser.updateUser.id
      console.log('res id', newId)
      return { data: { newId } }
    })
    .catch((error) => {
      console.log(error)
      return error
    })
}
export default passwordResetEmail;
