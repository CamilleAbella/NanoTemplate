import Discord from "discord.js"
import fs from "fs"
import path from "path"
import Logger from "./Logger"
import Text from "../utils/text"

Logger.load("file", __filename)

export interface CommandOptions {
  name: string
  pattern: RegExp
  botOwner?: true
  owner?: true
  admin?: true
  permissions?: Discord.PermissionResolvable[]
  users?: Discord.UserResolvable[]
  channelType?: "dm" | "guild"
  cooldown?: number
  typing?: true
  description?: string
  examples?: string[]
  args?: CommandArgumentGroup | CommandArgumentGroup[]
  call: (event: CommandEvent) => Promise<any> | any
}

export interface CommandArgumentGroup {
  [name: string]: CommandArgument
}

export interface CommandEvent {
  message: Discord.Message
  args: { [name: string]: any }
}

export interface CommandArgument {
  optional?: true
  default?: any
  type: CommandArgumentType
}

export type CommandArgumentType =
  | ((
      content: string,
      message?: Discord.Message
    ) => Promise<{ arg: any; rest?: string }> | { arg: any; rest?: string })
  | string
  | number
  | RegExp
  | (string | number | RegExp)[]
  | Array<string | number | RegExp>

export default class Command {
  /** Contains timestamps of last commands usage for each user */
  static cooldown: {
    [user: string]: { [commandName: string]: number }
  } = {}

  /** Contains all loaded commands */
  static commands: Discord.Collection<
    string,
    Command
  > = new Discord.Collection()

  public readonly originalPattern: RegExp

  constructor(public options: CommandOptions) {
    Command.commands.set(options.name, this)
    this.originalPattern = new RegExp(this.options.pattern)
    this.options.pattern = Text.improvePattern(this.originalPattern)
  }

  get name() {
    return this.options.name
  }
  get pattern() {
    return this.options.pattern
  }
  get botOwner() {
    return this.options.botOwner
  }
  get owner() {
    return this.options.owner
  }
  get admin() {
    return this.options.admin
  }
  get permissions() {
    return this.options.permissions
  }
  get users() {
    return this.options.users
  }
  get channelType() {
    return this.options.channelType
  }
  get cooldown() {
    return this.options.cooldown
  }
  get typing() {
    return this.options.typing
  }
  get description() {
    return this.options.description
  }
  get examples() {
    return this.options.examples
  }
  get args() {
    return this.options.args
  }

  async call(event: CommandEvent) {
    await this.options.call(event)
  }

  async parseArgs(message: Discord.Message, content: string) {
    const args: { [name: string]: any } = {}
    if (this.args) {
      let commandArgs: CommandArgumentGroup = {}

      function scalar(name: string, value: string | number | RegExp): boolean {
        if (value instanceof RegExp) {
          const pattern = Text.improvePattern(value)
          const match = pattern.exec(content)
          if (match) {
            content = content.replace(pattern, "").trim()
            args[name] = match[1] || match[0]
            return true
          }
        } else if (content.startsWith(String(value))) {
          content = content.replace(String(value), "").trim()
          args[name] = value
          return true
        }
        return false
      }

      if (Array.isArray(this.args)) {
        for (const group of this.args) {
          commandArgs = { ...group }
        }
      } else {
        commandArgs = this.args
      }

      for (const name in commandArgs) {
        const { type, default: _default } = commandArgs[name]

        if (typeof type === "function") {
          const { arg, rest } = await type(content, message)
          args[name] = arg
          content = rest || content
        } else if (Array.isArray(type)) {
          let i = 0
          for (const option of type) {
            if (scalar(name, option)) {
              args[name + "Index"] = i
              break
            }
            i++
          }
          if (args[name] === null) {
            if (~type.indexOf(_default)) {
              args[name + "Index"] = type.indexOf(_default)
            } else {
              i = 0
              for (const item of type) {
                if (item instanceof RegExp) {
                  if (item.test(_default)) {
                    args[name + "Index"] = i
                    break
                  }
                }
                i++
              }
            }
          }
        } else {
          scalar(name, type)
        }

        if (args[name] === null) args[name] = _default
      }
    }
    return args
  }

  static resolve(resolvable: string): { command?: Command; rest?: string } {
    let command = Command.commands.find((c) => c.pattern.test(resolvable))
    if (command)
      return { command, rest: resolvable.replace(command.pattern, "").trim() }
    return {}
  }
}

fs.readdirSync(path.join(__dirname, "..", "commands")).forEach((fileName) => {
  require(path.join(__dirname, "..", "commands", fileName))
})
