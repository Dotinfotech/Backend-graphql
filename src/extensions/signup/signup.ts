import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'
import * as validator from 'validator'

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
    password: $passwordHash
  ) {
    id
  }
}`

const getGraphcoolUser = async (api: any, email: any) => {
  await api.request(userQuery, { email })
    .then(userQueryResult => {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        let userQueryResultUser: any = userQueryResult.User
        return userQueryResultUser;
      }
    })
}

const createGraphcoolUser = async (api: any, email: any, passwordHash: any) => {
  await api.request(createUserMutation, { email, passwordHash })
    .then(userMutationResult => {
      let userMutationResultCreateUserID: any = userMutationResult.createUser.id
      return userMutationResultCreateUserID;
    })
}

export const signup = async (event: any) => {
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Signup not configured correctly.' }
  }

  // Retrieve payload from event
  const { email, password } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const SALT_ROUNDS = 10
  const salt = bcryptjs.genSaltSync(SALT_ROUNDS);

  if (validator.isEmail(email)) {
    return getGraphcoolUser(api, email)
      .then((graphcoolUser: any) => {
        if (!graphcoolUser) {
          return bcryptjs.hash(password, salt)
            .then(hash => createGraphcoolUser(api, email, hash))
        } else {
          return Promise.reject('Email already in use')
        }
      })
      .then((graphcoolUserId: any) => {
        return graphcool.generateAuthToken(graphcoolUserId, 'User')
          .then(token => {
            let DataToken: any = { data: { id: graphcoolUserId, token } }
            return DataToken;
          })
      })
      .catch(error => {
        console.log(`Error: ${JSON.stringify(error)}`)
        return { error: 'An unexpected error occured.' }
      })
  } else {
    return { error: 'Not a valid email' }
  }
}
