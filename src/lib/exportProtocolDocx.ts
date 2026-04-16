import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LevelFormat,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

type ProtocolDraftFormData = {
  poNumber: string;
  meetingDate: string;
  meetingPlace: string;
  protocolNumber: string;
  membersOnRegister: string;
  membersPresent: string;
  chairperson: string;
  secretary: string;
  invited: string;
  invitedGuests?: Array<{
    fullName: string;
    role: string;
  }>;
};

type ProtocolDraftQuestion = {
  title: string;
  notes: string;
  speaker: string;
  essence: string;
  decision: string;
  votesFor: string;
  votesAgainst: string;
  abstained: string;
};

function text(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized || fallback;
}

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function toDateLabel(value: string): string {
  if (!value.trim()) {
    return "дата оформления";
  }
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ru-RU");
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function invitedLines(formData: ProtocolDraftFormData): string[] {
  const fromGuests = (formData.invitedGuests ?? [])
    .map((guest) => ({
      fullName: guest.fullName.trim(),
      role: guest.role.trim(),
    }))
    .filter((guest) => guest.fullName || guest.role)
    .map((guest, index) => {
      if (guest.fullName && guest.role) {
        return `${index + 1}. ${guest.fullName}, ${guest.role}.`;
      }
      if (guest.fullName) {
        return `${index + 1}. ${guest.fullName}.`;
      }
      return `${index + 1}. ${guest.role}.`;
    });

  if (fromGuests.length > 0) {
    return fromGuests;
  }

  const fromText = splitLines(formData.invited);
  if (fromText.length > 0) {
    return fromText.map((line, index) => `${index + 1}. ${line}`);
  }

  // Если приглашённых нет, просто оставляем пустой блок без заглушек
  return [];
}

function ensureSentence(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  return /[.!?…]$/.test(normalized) ? normalized : `${normalized}.`;
}

function toAboutQuestionPhrase(title: string): string {
  const normalized = title.trim().replace(/[.?!]+$/, "");
  if (!normalized) {
    return "рассматриваемом вопросе";
  }

  const lowerCased =
    normalized.charAt(0).toLowerCase() + normalized.slice(1);

  if (/^(о|об|обо)\s/i.test(lowerCased)) {
    return lowerCased;
  }

  const [firstWord, ...restWords] = lowerCased.split(/\s+/);
  let transformedFirstWord = firstWord;

  if (firstWord.endsWith("ие")) {
    transformedFirstWord = `${firstWord.slice(0, -2)}ии`;
  } else if (firstWord.endsWith("ка")) {
    transformedFirstWord = `${firstWord.slice(0, -2)}ке`;
  } else if (firstWord.endsWith("га")) {
    transformedFirstWord = `${firstWord.slice(0, -2)}ге`;
  } else if (firstWord.endsWith("ха")) {
    transformedFirstWord = `${firstWord.slice(0, -2)}хе`;
  } else if (firstWord.endsWith("а")) {
    transformedFirstWord = `${firstWord.slice(0, -1)}е`;
  } else if (firstWord.endsWith("я")) {
    transformedFirstWord = `${firstWord.slice(0, -1)}и`;
  } else if (firstWord.endsWith("ы")) {
    transformedFirstWord = `${firstWord.slice(0, -1)}ах`;
  } else if (firstWord.endsWith("ь")) {
    transformedFirstWord = `${firstWord.slice(0, -1)}и`;
  } else if (/[бвгджзйклмнпрстфхцчшщ]$/i.test(firstWord)) {
    transformedFirstWord = `${firstWord}е`;
  }

  return [transformedFirstWord, ...restWords].join(" ");
}

function parseDecisionItems(question: ProtocolDraftQuestion): string[] {
  const raw = question.decision.trim();
  if (!raw) {
    return [
      `Принять к сведению информацию по вопросу «${text(
        question.title,
        "текущей повестки"
      )}».`,
      "Организовать выполнение принятого решения в установленные сроки.",
    ];
  }

  const lines = splitLines(raw).map((line) =>
    ensureSentence(line.replace(/^\d+[.)]\s*/, ""))
  );
  return lines.length > 0 ? lines : [ensureSentence(raw)];
}

function makeSignatureTable(formData: ProtocolDraftFormData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [new Paragraph("Председатель общего собрания")],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [new Paragraph(text(formData.chairperson, "________________"))],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [new Paragraph("")],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [new Paragraph("Секретарь общего собрания")],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [new Paragraph(text(formData.secretary, "________________"))],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [new Paragraph("")],
          }),
        ],
      }),
    ],
  });
}

function formatRuFullDate(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  const monthNames = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];

  const monthName = monthNames[month] ?? "";
  if (!monthName) return null;

  return `«${day}» ${monthName} ${year} г.`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportProtocolToDocx(
  formData: ProtocolDraftFormData,
  questions: ProtocolDraftQuestion[]
): Promise<void> {
  const listQuestions =
    questions.length > 0
      ? questions
      : [
          {
            title: "",
            notes: "",
            speaker: "",
            essence: "",
            decision: "",
            votesFor: "",
            votesAgainst: "",
            abstained: "",
          },
        ];
  const protocolNumber = formData.protocolNumber.trim() || "б/н";
  const poName = formData.poNumber.trim();

  const membersOnRegister = formData.membersOnRegister.trim();
  const membersPresent = formData.membersPresent.trim();
  const chairperson = formData.chairperson.trim();
  const secretary = formData.secretary.trim();

  const address =
    optionalText(formData.meetingPlace) ??
    "г. Санкт-Петербург, Новоизмайловский пр., д.85";
  const formattedDate = formatRuFullDate(formData.meetingDate) ?? "";

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
          },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
      paragraphStyles: [
        {
          id: "centerBold",
          name: "Center Bold",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, font: "Times New Roman", size: 24 },
          paragraph: { alignment: AlignmentType.CENTER },
        },
        {
          id: "questionHeader",
          name: "Question Header",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, font: "Times New Roman", size: 24 },
          paragraph: { alignment: AlignmentType.CENTER },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "agenda-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
        {
          reference: "decision-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 567,
              right: 567,
              bottom: 567,
              left: 1134,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [],
          }),
        },
        children: [
          // Заголовок
          new Paragraph({
            text: `ПРОТОКОЛ № ${protocolNumber}`,
            style: "centerBold",
          }),
          new Paragraph({
            text: `Общего собрания первичного отделения Партии «ЕДИНАЯ РОССИЯ» № ${poName}`,
            style: "centerBold",
          }),
          new Paragraph({
            text: "местного отделения муниципального образования Новоизмайловское",
            style: "centerBold",
          }),
          new Paragraph(""),
          // Строка место / дата через таблицу
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [new Paragraph({ text: address })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: formattedDate })],
                        alignment: AlignmentType.RIGHT,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph(""),
          // Учёт и присутствие
          ...(membersOnRegister
            ? [
                new Paragraph({
                  text: `На учете в первичном отделении Партии состоит ${membersOnRegister} членов Партии.`,
                }),
              ]
            : []),
          ...(membersPresent
            ? [
                new Paragraph({
                  text: `На собрании присутствуют ${membersPresent} членов Партии.`,
                }),
              ]
            : []),
          new Paragraph(""),
          new Paragraph({
            text: "Кворум имеется. Лист регистрации прилагается.",
          }),
          new Paragraph({
            text: "На собрание приглашены и присутствуют:",
          }),
          ...invitedLines(formData).map((line) => new Paragraph({ text: line })),
          new Paragraph(""),
          // Председатель
          new Paragraph({
            children: [
              new TextRun({
                text: "ПРЕДСЕДАТЕЛЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН:",
                bold: true,
              }),
              new TextRun({
                text: chairperson ? ` ${chairperson}` : "",
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "ГОЛОСОВАЛИ:", bold: true })],
          }),
          new Paragraph({
            text: `«за» - ${membersPresent || "0"}, «против» - 0, «воздержались» - 0`,
          }),
          new Paragraph(""),
          // Секретарь
          new Paragraph({
            children: [
              new TextRun({
                text: "СЕКРЕТАРЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН:",
                bold: true,
              }),
              new TextRun({
                text: secretary ? ` ${secretary}` : "",
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "ГОЛОСОВАЛИ:", bold: true })],
          }),
          new Paragraph({
            text: `«за» - ${membersPresent || "0"}, «против» - 0, «воздержались» - 0`,
          }),
          new Paragraph(""),
          // Слушали / Повестка
          new Paragraph({
            children: [new TextRun({ text: "СЛУШАЛИ:", bold: true })],
          }),
          new Paragraph({
            text: "Информацию Председателя собрания об утверждении повестки Общего собрания.",
          }),
          new Paragraph(""),
          new Paragraph({
            children: [new TextRun({ text: "ПОВЕСТКА:", bold: true, underline: {} })],
          }),
          ...listQuestions.map(
            (question, index) =>
              new Paragraph({
                text: text(
                  question.title,
                  `Вопрос ${index + 1} (формулировка уточняется при оформлении)`
                ),
                numbering: {
                  reference: "agenda-list",
                  level: 0,
                },
              })
          ),
          new Paragraph(""),
          // Стандартный блок: утверждение повестки
          new Paragraph({
            children: [new TextRun({ text: "РЕШИЛИ:", bold: true })],
          }),
          new Paragraph({
            text: "Утвердить предложенную повестку.",
          }),
          new Paragraph({
            children: [new TextRun({ text: "ГОЛОСОВАЛИ:", bold: true })],
          }),
          new Paragraph({
            text: `«за» - ${membersPresent || "0"}, «против» - 0, «воздержались» - 0`,
          }),
          new Paragraph(""),
          // Стандартный блок: утверждение регламента
          new Paragraph({
            children: [new TextRun({ text: "СЛУШАЛИ:", bold: true })],
          }),
          new Paragraph({
            text: "Информацию Председателя собрания об утверждении регламента работы Общего собрания.",
          }),
          new Paragraph({
            children: [new TextRun({ text: "РЕШИЛИ:", bold: true })],
          }),
          new Paragraph({
            text: "Утвердить предложенный регламент работы: на выступления - по 5 минут.",
          }),
          new Paragraph({
            children: [new TextRun({ text: "ГОЛОСОВАЛИ:", bold: true })],
          }),
          new Paragraph({
            text: `«за» - ${membersPresent || "0"}, «против» - 0, «воздержались» - 0`,
          }),
          new Paragraph(""),
          // Блоки по каждому вопросу повестки
          ...listQuestions.flatMap((question, index) => {
            const headingWords = [
              "первому",
              "второму",
              "третьему",
              "четвертому",
              "пятому",
              "шестому",
              "седьмому",
              "восьмому",
              "девятому",
              "десятому",
            ];
            const nWord = headingWords[index] ?? `${index + 1}-му`;
            const decisionItems = parseDecisionItems(question);

            const rawTitle = question.title.trim();
            const rawEssence = question.essence.trim();
            const rawSpeaker = question.speaker.trim();
            const speakerObjectLabel =
              rawSpeaker || (index === 0 ? "Секретаря ПО" : "Председателя собрания");
            const speakerSubjectLabel =
              rawSpeaker || (index === 0 ? "Секретарь ПО" : "Председатель собрания");
            const aboutTitle = toAboutQuestionPhrase(rawTitle);

            const neutralEssence =
              "содержанию рассматриваемого вопроса, отраженному в материалах собрания.";

            const slushaliLine =
              rawEssence ||
              (rawTitle
                ? `Информацию ${speakerObjectLabel} о ${aboutTitle}. ${speakerSubjectLabel} проинформировал(а) о ${neutralEssence}`
                : `Информацию ${speakerObjectLabel} по рассматриваемому вопросу. ${speakerSubjectLabel} проинформировал(а) о ${neutralEssence}`);

            return [
              new Paragraph({
                text: `${index + 1}. По ${nWord} вопросу повестки:`,
                style: "questionHeader",
              }),
              new Paragraph({
                children: [new TextRun({ text: "СЛУШАЛИ:", bold: true })],
              }),
              new Paragraph({
                text: slushaliLine,
              }),
              new Paragraph({
                children: [new TextRun({ text: "РЕШИЛИ:", bold: true })],
              }),
              ...decisionItems.map(
                (item) =>
                  new Paragraph({
                    text: item,
                    numbering: {
                      reference: "decision-list",
                      level: 0,
                    },
                  })
              ),
              new Paragraph({
                children: [new TextRun({ text: "ГОЛОСОВАЛИ:", bold: true })],
              }),
              new Paragraph({
                text: `«за» - ${membersPresent || "0"}, «против» - 0, «воздержались» - 0`,
              }),
              new Paragraph(""),
            ];
          }),
          makeSignatureTable(formData),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `protokol-po-${protocolNumber}.docx`);
}
