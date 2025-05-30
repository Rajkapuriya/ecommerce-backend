const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async options => {
    // 1) Create a transporter
    try {

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD // Use the app password here
            }
        });

        // 2) Define the email options
        const mailOptions = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: options.email,
            subject: options.subject,
            text: options.message
            // html: options.html
        };

        // 3) Actually send the email
        await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${options.email}`);
    } catch (err) {
        logger.error(`Email could not be sent: ${err}`);
        throw err;
    }
};

module.exports = sendEmail;