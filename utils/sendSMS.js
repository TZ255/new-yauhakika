import axios from "axios";
import { sendTelegramNotification } from "./sendTelegramNotifications.js";

export const sendNormalSMS = async (to, message) => {
    if (process.env.local === 'true' || !message) return console.log('I cant send SMS in local environment or message body is null');

    const API_KEY = process.env.SMS_API_KEY;
    const DEVICE_ID = "68f7e5c96a418a16ecf96056";

    //function to format number to international format, if starts with + keep it, else add +, if starts with 0 and is 10 digits, replace 0 with +255
    const formatPhoneNumber = (number) => {
        if (number.startsWith('+')) return number;
        if (number.startsWith('0') && number.length === 10) {
            return `+255${number.slice(1)}`;
        }
        return `+${number}`;
    };

    const receiver = formatPhoneNumber(to);
    try {
        const response = await axios.post(
            `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
            {
                recipients: [`${receiver}`],
                message: `${message}`
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                }
            }
        );

        console.log('SMS sent successfully to:', to);
        const data = response.data;
        console.log('SMS Req successfully:', data)
    } catch (error) {
        console.error('Error sending SMS:', error.response?.data || error.message);
        sendTelegramNotification(`Error sending SMS to ${to}: ${error.response?.data || error.message}`);
    }
}

export const sendNEXTSMS = async (to, message) => {
    try {
        const NEXTSMS_API_KEY = process.env.NEXTSMS_API_KEY || null

        if (!NEXTSMS_API_KEY) return console.log(`Error sending NEXTSMS: API KEY is null`);

        const data = JSON.stringify({
            "from": "UhakikaTips",
            "to": to,
            "text": message,
            "flash": 0,
            "reference": Date.now()
        });

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://messaging-service.co.tz/api/sms/v2/text/single',
            headers: {
                'Authorization': `Bearer ${NEXTSMS_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: data
        };

        const res = await axios(config)
        console.log(`NEXTSMS sent to ${to} successfully:`, res?.data)
    } catch (error) {
        console.log(`Error sending NEXTSMS:`, error?.message)
        sendTelegramNotification(`Error sending NEXTSMS to ${to}: ${error.response?.data || error.message}`);
    }
}