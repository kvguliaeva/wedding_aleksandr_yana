/** Данные приглашения. После редактирования выполните pnpm build. */
export const weddingConfig = {
  couple: { groom: 'Александр', bride: 'Яна' },
  weddingDate: '2027-01-30T16:00:00+05:00',
  timeZone: 'Asia/Yekaterinburg',
  flower: './assets/botanical-flower.jpg',
  hero: {
    label: 'WEDDING',
    scrollLabel: 'ЛИСТАЙТЕ ВНИЗ',
  },
  greeting: {
    title: 'Дорогие наши\nродные и друзья!',
    paragraphs: [
      'С огромной радостью приглашаем вас разделить с нами один из самых важных дней в нашей жизни — день рождения семьи!',
      'Мы очень хотим, чтобы в этот день рядом были самые близкие и любимые люди.',
    ],
    signature: 'С любовью, Александр и Яна',
  },
  calendar: { title: 'Сохраните этот день', note: 'Самое важное в этот день — быть рядом.', arrivalTitle: 'Сбор гостей', arrivalTime: '16:00' },
  venue: {
    title: 'Локация',
    name: 'AurA Grand Hall',
    address: 'г. Пермь, ул. Куйбышева, 66',
    image: './assets/aura-grand-hall.jpg',
    imageAlt: 'Светлый банкетный зал AurA Grand Hall в Перми',
    description: 'Наш праздник пройдёт в банкетном зале AurA Grand Hall. Будем ждать вас в этом красивом месте, чтобы вместе наполнить вечер улыбками, тёплыми словами и счастливыми моментами.',
    mapUrl: 'https://yandex.ru/maps/?text=AurA%20Grand%20Hall%2C%20%D0%9F%D0%B5%D1%80%D0%BC%D1%8C%2C%20%D0%9A%D1%83%D0%B9%D0%B1%D1%8B%D1%88%D0%B5%D0%B2%D0%B0%2C%2066',
    button: 'Посмотреть на карте',
  },
  rsvp: {
    title: 'Анкета гостя',
    introduction: 'Пожалуйста, подтвердите, сможете ли вы разделить с нами этот день. Если вы придёте с кем-то ещё, укажите это в анкете.',
    deadline: '2027-01-15',
    deadlineLabel: 'Ждём ваш ответ до 15 января 2027 года',
    button: 'Подтвердить присутствие',
    companionsQuestion: 'Придёте не одни?',
    companionsPlaceholder: 'Напишите имена и фамилии тех, кто будет с вами',
    companionsHint: 'Если придёте одни, оставьте поле пустым.',
    // /exec-ссылку Apps Script можно задать в public/rsvp-config.json
    // даже после сборки, при загрузке на GitHub Pages.
    endpoint: import.meta.env.VITE_RSVP_ENDPOINT?.trim() || '',
  },
  closing: {
    title: 'Ждём вас\nв нашем счастливом дне',
    text: 'Пусть этот день станет тёплым воспоминанием, которое мы сохраним вместе.',
    signature: 'Ваши Александр и Яна',
  },
} as const;
