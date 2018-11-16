# dotbackend-graphql
Admin Panel - UserAuthentication Signup, LoggedInUser, Forgot Password

# Run
1. Install Dependencies - npm install 
2. Install GraphCool globally to use CLI features `npm install -g graphcool`
3. graphcool console 
4. graphcool playground

Make Mutation in Graphcool Console

`mutation{
  signupUser(email:"newUser@gmail.com",password:"123Test"){
    id
    token
  }
}`

`mutation{
  authenticateUser(email:"newUser@gmail.com",password:"123Test"){
    token
  }
}`

To check for loggedInUser - Copy the GeneratedToken in HTTP Header option as 

Authorization: Bearer <Token> and it will return loggedIn User ID

`query{
  loggedInUser{
    id
  }
}`

References :

[GraphCool Website](https://www.graph.cool/)

[GraphCool Console](https://console.graph.cool/)

[GraphCool Playground](https://console.graph.cool/auth/playground)

[GraphQL](https://graphql.org/)
