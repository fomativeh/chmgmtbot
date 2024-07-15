// Required libraries
const { Telegraf } = require("telegraf");
const { mongoose, Schema } = require("mongoose");
const { MongoClient } = require("mongodb");
require("dotenv/config");
const Channel = require("./models/channelSchema");
const User = require("./models/userSchema");
const CustomText = require("./models/customTextSchema");
const Queue = require("queue-promise");
const handleError = require("./helpers/handleError");
const showAdminMenu = require("./helpers/showAdminMenu");
const useAdminAuth = require("./helpers/useAdminAuth");
const setExpirationDateAndTime = require("./helpers/setExpirationDateAndTime");
const express = require("express");
const getRemainingDuration = require("./helpers/getRemainingDuration");
const banUserFromChannels = require("./helpers/banUserFromChannels");

// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process 25 requests at in 3 seconds
  interval: 3000, // Interval between dequeue operations (3 seconds)
});

// Telegraf bot setup
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);
const ADMIN_ID = process.env.ADMIN_ID;
const app = express();

bot.start(async (ctx) => {
  queue.enqueue(async () => {
    try {
      const { id, username } = ctx.from;

      // Show this to admins
      if (id == ADMIN_ID) {
        return showAdminMenu(ctx);
      }

      //Show this to users
      const userAccount = await User.findOne({ userId: id });

      //Show this to new users
      if (!userAccount) {
        return await ctx.reply(
          `Hi, *${username}*.\n\nYou are not on premium subscription. Please contact admin @Mrrobot75 to subscribe.`,
          { parse_mode: "Markdown" }
        );
      }

      //Show this to users with expired premium accounts
      if (!userAccount.isPremiumActive) {
        return await ctx.reply(
          `Hi, *${username}*.\n\nYour premium subscription is expired. Please contact admin @Mrrobot75 to  renew your subscription.`,
          { parse_mode: "Markdown" }
        );
      }

      //Check is their premium expiration date is completed, and disable premium
      if (userAccount.premiumExpirationDate) {
        //if they've been on premium before
        const currentDate = new Date().toISOString();
        if (userAccount.premiumExpirationDate > currentDate) {
          userAccount.isPremiumActive = false;
          await userAccount.save();

          //Ban them from the channels
          await banUserFromChannels(id);

          return await ctx.reply(
            `Hi, *${username}*.\n\nYour premium subscription is expired. Please contact admin @Mrrobot75 to  renew your subscription.`,
            { parse_mode: "Markdown" }
          );
        }
      }

      //Show this to active premium users
      const allChannels = await Channel.find();
      if (allChannels.length == 0) {
        //Show this when there are no channels yet
        const replyTextForNoChannels = `
        Hi, *${username}*,
  
You're on premium.
        `;
        return await ctx.reply(replyTextForNoChannels, {
          parse_mode: "Markdown",
        });
      }

      //Show this when there are channels
      const replyText = `
      Hi, *${username}*,

You're on premium, so you have access to the channels below:
      `;
      const channelsMarkupRow = [];
      allChannels.forEach((eachChannel) => {
        channelsMarkupRow.push([
          {
            text: `${eachChannel.title}`,
            url: `${eachChannel.channelInviteLink}`,
          },
        ]);
      });

      ctx.reply(replyText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [...channelsMarkupRow],
        },
      });
      //   console.log(allChannels);
    } catch (error) {
      //Other errors
      handleError(error, ctx);
    }
  });
});

// Command to add channel
bot.command("nadd", async (ctx) => {
  queue.enqueue(async () => {
    // let isAdmin = useAdminAuth(ctx);
    // if (!isAdmin) {
    //   return await ctx.reply("Only Admins can do this.");
    // }

    const [command, channelId, channelLink] = ctx.message.text.split(" ");
    try {
      if (!channelId) {
        return await ctx.reply("Channel id or username is required");
      }

      if (!channelLink) {
        return await ctx.reply(
          "Channel link is required. Make sure it is a valid link!"
        );
      }

      // const addedBy = ctx.from.username;

      const chat = await bot.telegram.getChat(channelId);
      // return console.log(chat)
      let newChannelDetails = {};
      //For private channels (have only invite links)
      newChannelDetails = {
        channelId,
        channelInviteLink: channelLink,
        title: chat.title ? chat.title : "Join channel",
      };

      const newChannel = new Channel(newChannelDetails);

      await newChannel.save();
      ctx.reply(`Channel ${channelId} added successfully.`);
    } catch (error) {
      //For other errors
      handleError(error, ctx);

      //For invalid channel id or username
      if (
        error.response &&
        error.response.error_code === 400 &&
        error.response.description === "Bad Request: chat not found"
      ) {
        ctx.reply("Invalid channel id");
      }
    }
  });
});

// Command to remove channel
bot.command("rmnch", async (ctx) => {
  queue.enqueue(async () => {
    let isAdmin = useAdminAuth(ctx);
    (isAdmin);
    if (!isAdmin) {
      return await ctx.reply("Only Admins can do this.");
    }

    const [command, channelId] = ctx.message.text.split(" ");
    if (!channelId) {
      return ctx.reply("Channel id or username is required");
    }

    const channelExists = await Channel.findOne({ channelId });
    if (!channelExists) {
      return await ctx.reply("Channel does not exist in this bot.");
    }

    try {
      await Channel.findOneAndDelete({ channelId });
      ctx.reply(`Channel ${channelId} removed`);
    } catch (error) {
      handleError(error, ctx);
    }
  });
});

// Command to show all channels
bot.command("nchannels", async (ctx) => {
  queue.enqueue(async () => {
    try {
      let isAdmin = useAdminAuth(ctx);
      if (!isAdmin) {
        return await ctx.reply("Only Admins can do this.");
      }

      const allChannels = await Channel.find();
      if (allChannels.length > 0) {
        let replyText = `
*ALL CHANNELS*`;
        allChannels.forEach((eachChannel) => {
            //For private channels
            replyText += `\n\nChannel ID: \`${eachChannel.channelId}\`\nTitle: *${eachChannel.title}*\n[Visit Channel](${eachChannel.channelInviteLink})`;
        });

        await ctx.reply(replyText, { parse_mode: "Markdown" });
      } else {
        ctx.reply("No channels found.");
      }
    } catch (error) {
      handleError(error, ctx);
    }
  });
});

// Command to add user with subscription days
bot.command("adduser", async (ctx) => {
  queue.enqueue(async () => {
    const [command, userId, days] = ctx.message.text.split(" ");
    try {
      let isAdmin = useAdminAuth(ctx);
      if (!isAdmin) {
        return await ctx.reply("Only Admins can do this.");
      }

      if (!userId) {
        return await ctx.reply("User id is required.");
      }

      if (!days) {
        return await ctx.reply("Subscription days is required.");
      }

      const expirationDate = setExpirationDateAndTime(days);
      if (!expirationDate) {
        return await ctx.reply(
          "Invalid duration format. Use formats like 2s, 2min, 2hr, 2d after userId.\nExample: /adduser 87438784 30d"
        );
      }

      const addedBy = ctx.from.username;
      const userDetails = await User.findOne({ userId });

      if (userDetails) {
        //If user already exists
        userDetails.isPremiumActive = true;
        userDetails.premiumExpirationDate = expirationDate;
        await userDetails.save();
      } else {
        const newUser = new User({
          userId,
          isPremiumActive: true,
          premiumExpirationDate: expirationDate,
          addedBy,
        });
        await newUser.save();
      }

      await ctx.reply(`User ${userId} added for ${days} by @${addedBy}`);
    } catch (error) {
      handleError(error, ctx);
    }
  });
});

// Command to remove user
bot.command("rmuser", async (ctx) => {
  queue.enqueue(async () => {
    const [command, userId] = ctx.message.text.split(" ");

    try {
      let isAdmin = useAdminAuth(ctx);
      if (!isAdmin) {
        return await ctx.reply("Only Admins can do this.");
      }

      if (!userId) {
        return await ctx.reply("User id is required.");
      }

      const userExists = await User.findOne({ userId });
      if (!userExists) {
        return await ctx.reply("User does not exist in this bot.");
      }

      await User.findOneAndUpdate({ userId }, { isPremiumActive: false });
      await banUserFromChannels(userId)
      await ctx.reply(`User ${userId} removed from premium list.`);
    } catch (error) {
      handleError(error, ctx);
    }
  });
});

// Command to show all users
bot.command("nusers", async (ctx) => {
  queue.enqueue(async () => {
    try {
      let isAdmin = useAdminAuth(ctx);
      if (!isAdmin) {
        return await ctx.reply("Only Admins can do this.");
      }

      const users = await User.find();
      if (users.length > 0) {
        let replyText = `All users:`;
        let usersToMap = users.filter((eachUser)=>eachUser.isPremiumActive==true)

        usersToMap.forEach((eachUser) => {
          const expiresIn = getRemainingDuration(
            eachUser.premiumExpirationDate
          );
          replyText += `\n\nUser ID: \`${eachUser.userId}\`\nPremium: *${eachUser.isPremiumActive}*\nPremium Time Left: *${expiresIn}*`;
        });

        await ctx.reply(replyText, { parse_mode: "Markdown" });
      } else {
        await ctx.reply("No users found.");
      }
    } catch (error) {
      handleError(error, ctx);
    }
  });
});

// Command to set custom text for banned users
bot.command("settext", async (ctx) => {
  queue.enqueue(async () => {
    try {
      let isAdmin = useAdminAuth(ctx);
      if (!isAdmin) {
        return await ctx.reply("Only Admins can do this.");
      }

      const customText = ctx.message.text.split(" ").slice(1).join(" ");
      if (!customText) {
        return await ctx.reply("Text value is required");
      }

      const existingTextInDb = await CustomText.find();
      if (existingTextInDb.value) {
        existingTextInDb.value = customText;
        await existingTextInDb.save();
      } else {
        const newCustomText = new CustomText({ value: customText });
        await newCustomText.save();
      }

      await ctx.reply(`Custom text set: ${customText}`);
    } catch (error) {
      handleError(error, ctx);
    }
  });
});

bot.on("chat_join_request", async (ctx) => {
  queue.enqueue(async () => {
    try {
      const chatId = ctx.update.chat_join_request.chat.id;
      const userId = ctx.update.chat_join_request.from.id;
      const allUsers = await User.find();

      allUsers.forEach(async (eachUser) => {
        if (eachUser.userId == userId) {
          if (eachUser.isPremiumActive) {
            await bot.telegram.approveChatJoinRequest(chatId, userId);
            console.log("Auto approved premium user");
          } else {
            console.log("Ignored non premium user request");
          }
        }
      });
    } catch (error) {
      handleError(error);
    }
  });
});

bot.telegram.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "nadd", description: "Add a channel" },
  { command: "rmnch", description: "Remove a channel" },
  { command: "nchannels", description: "Show all channels" },
  { command: "adduser", description: "Add a user with subscription days" },
  { command: "rmuser", description: "Remove a user" },
  { command: "nusers", description: "Show all users" },
  { command: "settext", description: "Set custom text for banned users" },
]);

//Constantly verifies premium accounts

const initPremiumPolice = async () => {
  try {
    const allUsers = await User.find();
    allUsers.forEach(async (eachUser) => {
      const expiresIn = getRemainingDuration(eachUser.premiumExpirationDate);
      if (expiresIn == "Expired") {
        eachUser.isPremiumActive = false;
        await eachUser.save();
        await banUserFromChannels(eachUser.userId);
      }
    });
    initPremiumPolice(); //Recursion
  } catch (error) {
    console.log(error);
  }
};

// MongoDB connection string
const MONGODB_URI = process.env.URI;
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    //Start checks on premium
    initPremiumPolice();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Launch the bot
bot.launch().then(() => console.log("Bot started"));
