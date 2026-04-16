import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LevelFormat,
  Packer,
  PageOrientation,
  Paragraph,
  Tab,
  TabStopPosition,
  TabStopType,
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

  return ["Сведения о приглашённых лицах вносятся при оформлении протокола."];
}

function ensureSentence(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  return /[.!?…]$/.test(normalized) ? normalized : `${normalized}.`;
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
  const protocolNumber = text(formData.protocolNumber, "б/н");
  const poName = text(formData.poNumber, "номер уточняется");

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
          new Paragraph({
            text: `ПРОТОКОЛ № ${protocolNumber}`,
            style: "centerBold",
          }),
          new Paragraph({
            text: `Общего собрания первичного отделения Партии «ЕДИНАЯ РОССИЯ» № ${poName}`,
            style: "centerBold",
          }),
          new Paragraph({
            text: "Местное отделение Партии «ЕДИНАЯ РОССИЯ» района Новоизмайловское",
            style: "centerBold",
          }),
          new Paragraph(""),
          new Paragraph({
            children: [
              new TextRun(text(formData.meetingPlace, "Место проведения: уточняется")),
              new Tab(),
              new TextRun(`Дата: ${toDateLabel(formData.meetingDate)}`),
            ],
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
              },
            ],
          }),
          new Paragraph(""),
          new Paragraph({
            text: `На учете в первичном отделении Партии состоит ${text(
              formData.membersOnRegister,
              "сведения уточняются"
            )} членов Партии.`,
          }),
          new Paragraph({
            text: `На собрании присутствуют ${text(
              formData.membersPresent,
              "сведения уточняются"
            )} членов Партии.`,
          }),
          new Paragraph({
            text: "Кворум имеется. Лист регистрации прилагается.",
          }),
          new Paragraph({
            text: "На собрание приглашены и присутствуют:",
          }),
          ...invitedLines(formData).map((line) => new Paragraph({ text: line })),
          new Paragraph({
            children: [
              new TextRun({
                text: "ПРЕДСЕДАТЕЛЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН: ",
                bold: true,
              }),
              new TextRun(text(formData.chairperson, "определяется решением собрания")),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "ГОЛОСОВАЛИ: ",
                bold: true,
              }),
              new TextRun(
                `за — ${text(
                  formData.membersPresent,
                  "сведения уточняются"
                )}; против — 0; воздержались — 0.`
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "СЕКРЕТАРЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН: ",
                bold: true,
              }),
              new TextRun(text(formData.secretary, "определяется решением собрания")),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "ГОЛОСОВАЛИ: ",
                bold: true,
              }),
              new TextRun(
                `за — ${text(
                  formData.membersPresent,
                  "сведения уточняются"
                )}; против — 0; воздержались — 0.`
              ),
            ],
          }),
          new Paragraph({
            text: "СЛУШАЛИ: Информацию Председателя собрания об утверждении повестки Общего собрания.",
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

            return [
              new Paragraph({
                text: `${index + 1}. По ${nWord} вопросу повестки:`,
                style: "questionHeader",
              }),
              new Paragraph({
                children: [new TextRun({ text: "СЛУШАЛИ:", bold: true })],
              }),
              new Paragraph({
                text: text(
                  question.essence,
                  `Информацию по вопросу «${text(
                    question.title,
                    "повестки дня"
                  )}» довел(а) ${text(
                    question.speaker,
                    "уполномоченный представитель первичного отделения"
                  )}.`
                ),
              }),
              new Paragraph({
                children: [new TextRun({ text: "ВЫСТУПИЛ:", bold: true })],
              }),
              new Paragraph({
                text: text(
                  question.notes,
                  "Выступления по вопросу внесены в рабочие материалы собрания."
                ),
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
                text: `ЗА — ${text(
                  question.votesFor,
                  "сведения уточняются"
                )}; ПРОТИВ — ${text(
                  question.votesAgainst,
                  "сведения уточняются"
                )}; ВОЗДЕРЖАЛИСЬ — ${text(question.abstained, "сведения уточняются")}.`,
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
