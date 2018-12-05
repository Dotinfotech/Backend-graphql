// Importing Libraries
import { fromEvent } from 'graphcool-lib'
import * as sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
console.log('send key',sendKey)
sgMail.setApiKey(sendKey);

const resetPasswordSentMail = async (event: any) => {

    // Retrieve payload from event
    const { email } = event.data
    console.log('email',email)
    // Graphcool-Library Event and API
    const graphcool = fromEvent(event)
    const api = graphcool.api('simple/v1')
    const sendMail: any = {
        to: email,
        from: process.env.EMAIL_ID,
        subject: 'Account update',
        text: `This is a regarding for your account that password has been changed successfully.`
    };
    let reSend: any = sgMail.send(sendMail)
    console.log('mail data',reSend)
    return reSend
}

export default resetPasswordSentMail;