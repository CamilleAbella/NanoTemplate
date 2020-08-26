import Command from "../app/Command"
import Types from "../utils/types"
import Globals from "../app/Globals"
import Embed from "../app/Embed"

new Command({
  name: "Tweet Webhook Filter",
  pattern: /tw(?:eet|itter)?/i,
  description:
    "Gère l'ajout d'utilisateurs dont les tweet webhooks sont autorisés.",
  channelType: "guild",
  admin: true,
  args: {
    action: { type: Types.action },
    user: { type: Types.rest },
  },
  call: async ({ message, args: { action, user } }) => {
    if (!message.guild) return

    const embed = new Embed()

    if (!user && action !== "list") {
      await message.channel.send(
        embed.setTemplate(
          "Error",
          "Vous devez entrer un num d'utilisateur Twitter."
        )
      )
      return
    }

    switch (action) {
      case "add":
        Globals.db.push(message.guild.id, user, "authorizedTwitterUsers")
        message.channel.send(
          embed.setTemplate(
            "Success",
            `**${user}** a bien été ajouté à la liste d'utilisateurs dont les tweet sont autorisés.`
          )
        )
        break

      case "remove":
        Globals.db.remove(message.guild.id, user, "authorizedTwitterUsers")
        message.channel.send(
          embed.setTemplate(
            "Success",
            `**${user}** a bien été retiré de la liste d'utilisateurs dont les tweet sont autorisés.`
          )
        )
        break

      case "list":
        embed
          .setTitle("Liste des utilisateurs dont les tweet sont autorisés.")
          .setDescription(
            Globals.db
              .get(message.guild.id, "authorizedTwitterUsers")
              .join(", ")
              .trim() || "Aucun."
          )
        message.channel.send(embed)
        break

      default:
        message.channel.send(
          embed.setTemplate(
            "Error",
            "Vous devez préciser une action entre add, remove et list."
          )
        )
    }
  },
})
