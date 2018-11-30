import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);


//new
const getUserWithEmail: any = async (api: any, email: any) => {
  return await api.request(
    `query{
      User(email :"${email}"){
        id 
        email
      }
    }`
  )
    .then((userQueryResult: any) => {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        return userQueryResult.User
      }
    })
}

const getUserWithToken: any = async (api: any, resetToken: any) => {
  return await api.request(`
    query {
      User(resetToken: "${resetToken}") {
        id
        resetExpires
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

const updatePassword: any = async (api: any, id: any, newPasswordHash: any) => {
  return await api.request(`
    mutation {
      updateUser(
        id: "${id}",
        password: "${newPasswordHash}",
        resetToken: null,
        resetExpires: null
      ) {
        id
      }
    }`)
    .then((userMutationResult: any) => (userMutationResult.updateUser.id))
}

const passwordResetToken = async (event: any) => {

  const { resetToken } = event.data
  const newPassword = event.data.password

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const saltRounds = 10

  return await getUserWithToken(resetToken)
    .then((graphcoolUser: any) => {

      const userId: any = graphcoolUser.id
      const resetExpires: any = graphcoolUser.resetExpires

      if (new Date() > new Date(resetExpires)) {
        return Promise.reject('Token expired.')
      } else {
        return bcrypt.hash(newPassword, saltRounds)
          .then(hash => updatePassword(userId, hash))
          .then(id => ({ data: { id } }))
          .catch(error => ({ error: error.toString() }))
      }
    })
    .catch((error: any) => {
      console.log(error)
      return error
    })
    // return await getUserWithEmail(email)
    // .then((graphcoolUser: any) => {
    //   const email: any = graphcoolUser.email

    //   if (graphcoolUser === null) {
    //     return Promise.reject('Invalid Credentials')
    //   } else {
    //     const sendMail: any = {
    //       to: email,
    //       from: process.env.EMAIL_ID,
    //       subject: 'Your password has been changed',
    //       text: `This is a confirmation that the password for your account has just been changed.`
    //     };
    //     let sgMailSend: any = sgMail.send(sendMail)
    //     return sgMailSend
    //   }
    // })
    .then((message: any) => {
      return { data: { message: 'Your password has been changed' } }
    })
}
export default passwordResetToken;
