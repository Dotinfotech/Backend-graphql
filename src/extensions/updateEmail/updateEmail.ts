import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as validator from 'validator'
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

const updateEmail = async (event: any) => {

  const { email, password, newEmail } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const getGraphcoolUser = async (email: any) => {
    return await api.request(`
    query {
      User(email: "${email}") {
        id
        password
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

  const updateGraphcoolUser = async (id: any, newEmail: any) => {
    return await api.request(`
      mutation {
        updateUser(
          id: "${id}",
          email: "${newEmail}"
        ) {
          id
        }
      }`)
      .then((userMutationResult: any) => {
        return userMutationResult.updateUser.id
      })
  }

  if (validator.isEmail(newEmail)) {
    return await getGraphcoolUser(email)
      .then((graphcoolUser: any) => {
        if (graphcoolUser === null) {
          return Promise.reject("Invalid Credentials")
        } else {
          return bcrypt.compare(password, graphcoolUser.password)
            .then((res) => {
              if (res == true) {
                return updateGraphcoolUser(graphcoolUser.id, newEmail)
              } else {
                return Promise.reject("Invalid Credentials")
              }
            })
        }
      })
      .then((id: any) => {
        return { data: { id } }
      })
      .then((graphcoolUser: any) => {
        if (graphcoolUser) {
          const sendMail: any = {
            to: email,
            from: process.env.EMAIL_ID,
            subject: 'Account update',
            text: `This is a regarding for your account that email has been updated.`
          };
          let reSend: any = sgMail.send(sendMail)
          return reSend
        } else {
          return Promise.reject('Invalid Credentials')
        }
      })
      .catch((error: any) => {
        console.log(error)
        return error
      })
  } else {
    return { error: "Not a valid email" }
  }
}

export default updateEmail;
