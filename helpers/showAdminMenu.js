const handleError = require("./handleError")

module.exports = showAdminMenu = async (ctx)=>{
    try {

        ctx.reply("Welcome, Admin. Please use the menu commands to operate the bot.\n\nRemember to add me to a channel as an admin before adding the channel in the bot.")
        
    } catch (error) {
        handleError(error, ctx)
    }
}