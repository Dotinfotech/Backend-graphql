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
          console.log('getgraphcool user')
          return bcryptjs.hash(password, salt)
            .then((hash: any) => createGraphcoolUser(api, email, hash))
        } else {
          let newError: any = ('Email already in use');
          return newError
        }
      })
      .then((graphcoolUserId: any) => {
        return graphcool.generateAuthToken(graphcoolUserId, 'User')
          .then(token => {
            return { data: { id: graphcoolUserId, token } }
          })
      })
      .catch((error: any) => {
        console.log(`Error: ${JSON.stringify(error)}`)
        return error
      })
  } else {
    return { error: 'Not a valid email' }
  }
}
export default signup;

