// Importing Libraries
import { fromEvent } from 'graphcool-lib'
import * as validator from 'validator'
import * as sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
console.log('send key', sendKey)
sgMail.setApiKey(sendKey);

const resetPassword = async (event: any) => {

    // Retrieve payload from event
    const { email } = event.data.User.node
    console.log('EmailID', email)

    // Graphcool-Lib Event and API
    const graphcool = fromEvent(event)
    const api = graphcool.api('simple/v1')

    // FetchUser Function with Email
    const getGraphcoolUser = async (email: any) => {
        return await api.request(`
        query {
            User(email: "${email}") {
                email
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
    if (validator.isEmail(email)) {
        console.log('email', email)
        return await getGraphcoolUser(email)
            .then((graphcoolUser: any) => {
                if (graphcoolUser) {
                    const sendMail: any = {
                        to: email,
                        from: process.env.EMAIL_ID,
                        subject: 'Account update',
                        text: `Your password has been changed successfully.`
                    };
                    let reSend: any = sgMail.send(sendMail)
                    return reSend
                } else {
                    return Promise.reject('Email Already Sent')
                }
            })
            .catch((error: any) => {
                console.log(`Error: ${JSON.stringify(error)}`)
                throw { error: 'An error occurred' }
            })
    }
    else {
        return { Error: 'Not a valid Email' }
    }
}
// Exporting main function
export default resetPassword;