import { prisma } from "@/lib/prisma";
import { DocumentStatus, DocumentType, OrganType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    let poOrgan = await prisma.organ.findFirst({
      where: {
        type: OrganType.PO,
        code: data.poNumber || null,
      },
    });

    if (!poOrgan) {
      poOrgan = await prisma.organ.create({
        data: {
          name: data.poNumber
            ? `Первичное отделение ${data.poNumber}`
            : "Первичное отделение",
          type: OrganType.PO,
          code: data.poNumber || null,
        },
      });
    }

    const document = await prisma.document.create({
      data: {
        title: `Протокол общего собрания ПО ${data.poNumber || ""}`.trim(),
        type: DocumentType.PROTOCOL,
        status: DocumentStatus.DRAFT,
        number: data.protocolNumber || null,
        meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
        place: data.meetingPlace || null,
        body: data.protocolDraft || "",
        organId: poOrgan.id,
        agendaItems: {
          create: (data.questions || []).map(
            (
              question: {
                title?: string;
                notes?: string;
                speaker?: string;
                essence?: string;
                decision?: string;
                votesFor?: string;
                votesAgainst?: string;
                abstained?: string;
              },
              index: number
            ) => ({
              orderIndex: index + 1,
              title: question.title || "",
              notes: question.notes || "",
              speaker: question.speaker || "",
              essence: question.essence || "",
              decision: question.decision || "",
              votesFor: question.votesFor || "",
              votesAgainst: question.votesAgainst || "",
              abstained: question.abstained || "",
            })
          ),
        },
      },
      include: {
        agendaItems: true,
        organ: true,
      },
    });

    return NextResponse.json({ ok: true, document });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Ошибка сохранения протокола" },
      { status: 500 }
    );
  }
}