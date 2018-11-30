import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'
import * as validator from 'validator'
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

const createUserMutation = `
mutation CreateUserMutation($email: String!, $passwordHash: String!) {
  createUser(
    email: $email,
    password: $passwordHash,
  ) {
    id
  }
}`

const createGraphcoolUser = async (api: any, email: any, passwordHash: any) => {
  return await api.request(createUserMutation, { email, passwordHash })
    .then((userMutationResult: any) => {
      return userMutationResult.createUser.id
    })
}
const getGraphcoolUser = async (api: any, email: any) => {
  return await api.request(userQuery, { email }).then((userQueryResult: any) => {
    if (userQueryResult.error) {
      return Promise.reject(userQueryResult.error)
    } else {
      return userQueryResult.User
    }
  })
}
const signup = async (event: any) => {
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Signup not configured correctly.' }
  }
  // Retrieve payload from event
  const { email, password } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const SALT_ROUNDS = 10
  const salt = bcryptjs.genSaltSync(SALT_ROUNDS)

  if (validator.isEmail(email)) {
    return await getGraphcoolUser(api, email)
      .then((graphcoolUser: any) => {
        if (!graphcoolUser) {
          return bcryptjs.hash(password, salt)
            .then((hash: any) => createGraphcoolUser(api, email, hash))
        }
        else {
          let newError: any = Promise.reject('Email already in use');
          return newError
        }
      })
      .then((graphcoolUserId: any) => {
        console.log('gc u id', graphcoolUserId)
        return graphcool.generateAuthToken(graphcoolUserId, 'User')
          .then(token => {
            let tokenData = { data: { token: token } }
            return tokenData
          })
      })
      .then((graphcoolUser: any) => {
        if (graphcoolUser) {
          const sendMail: any = {
            to: email,
            from: process.env.EMAIL_ID,
            subject: 'Account Creation',
            text: `This is a confirmation for your account has just been created.`
          };
          let reSend: any = sgMail.send(sendMail)
          return reSend
        } else {
          return Promise.reject('Invalid Credentials')
        }
      })
      .catch((error: any) => {
        // console.log(`Error: ${JSON.stringify(error)}`)
        return error
      })
  } else {
    return { error: 'Not a valid email' }
  }
}
export default signup;

