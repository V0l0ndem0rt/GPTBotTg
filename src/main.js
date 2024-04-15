import { Telegraf, session } from 'telegraf'; // Подключаем библиотеку
import { message } from 'telegraf/filters'; // Подключаем фильтр
import { code } from 'telegraf/format'; // Подключаем фильтр
import config from 'config'; // Подключаем конфиг
import { ogg } from './ogg.js';
import { openai } from './openai.js'
import { removeFile } from './utils.js'
import { initCommand, processTextToChat, INITIAL_SESSION } from './logic.js'

const bot = new Telegraf(config.get('TELEGRAM_BOT_TOKEN')); // Токен бота

// говорим боту, чтобы он использовал session
bot.use(session())

// при вызове команды new и start бот регистрирует новую беседу,
// новый контекст
bot.command('new', initCommand)
bot.command('start', initCommand)

bot.on(message('voice'), async (ctx) => {

  // если сессия не определилась, создаем новую
  ctx.session ??= INITIAL_SESSION
  try {
    await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)

    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const text = await openai.transcription(mp3Path)
    await ctx.reply(code(`Ваш запрос: ${text}`))
    await processTextToChat(ctx, text)
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})

bot.on(message('text'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    try {
      await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
      await processTextToChat(ctx, ctx.message.text)
    } catch (e) {
      console.log(`Error while voice message`, e.message)
    }
  })




// // обработчик команды /start
// bot.command('start', async ctx => {
//     await ctx.reply(JSON.stringify(ctx.message, null, 2))
// })

bot.launch(); // Запуск бота

process.once('SIGINT', () => bot.stop('SIGINT')); // Остановка бота при отказе
process.once('SIGTERM', () => bot.stop('SIGTERM')); // Остановка бота при передаче сигнала SIGTERM