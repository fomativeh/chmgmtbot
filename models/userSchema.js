const { model, Schema } = require("mongoose");

const userSchema = new Schema(
  {
    userId: String,
    premiumExpirationDate: Date,
    isPremiumActive: Boolean,
  },
  { timestamps: true }
);

const User = model("User", userSchema);

module.exports = User;
