// Importing libraries
import { fromEvent } from 'graphcool-lib'

// UserQuery for Email
const userQuery = `
query UserQuery($userId: ID!) {
  User(id: $userId){
    id
    password
  }
}`

//FetchUser with UserID
const getUser = async (api: any, userId: any) => {
  return await api.request(userQuery, { userId })
    .then((userQueryResult: any) => {
      return userQueryResult.User
    })
    .catch((error: any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      return { error: `An unexpected error occured` }
    })
}

// Main Export Function 
const loggedInUser = async (event: any) => {
  // Validating Root Token
  if (!event.context.auth || !event.context.auth.nodeId) {
    console.log(`No auth context`)
    return { data: { id: null } }
  }

  // Retrieve payload from event
  const userId = event.context.auth.nodeId
  console.log(`Node ID: ${userId}`)

  // Graphcool-Library Event and API
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  return await getUser(api, userId)
    .then((emailUser: any) => {
      if (!emailUser) {
        return { error: `No user with id: ${userId}` }
      }
      return { data: emailUser }
    })
    .catch((error: any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      throw { error: 'An error occurred' }
    })
}
// Exporting Main Function
export default loggedInUser;