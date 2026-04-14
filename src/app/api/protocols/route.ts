import { prisma } from "@/lib/prisma";
import { DocumentStatus, DocumentType, OrganType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      where: {
        type: DocumentType.PROTOCOL,
        organ: {
          type: OrganType.PO,
        },
      },
      include: {
        organ: true,
        agendaItems: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, documents });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Ошибка получения протоколов" },
      { status: 500 }
    );
  }
}

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
export async function DELETE(request: Request) {
    try {
      const { id } = await request.json();
  
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Не передан id протокола" },
          { status: 400 }
        );
      }
  
      await prisma.document.delete({
        where: {
          id,
        },
      });
  
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { ok: false, error: "Ошибка удаления протокола" },
        { status: 500 }
      );
    }
  }export async function PUT(request: Request) {
    try {
      const data = await request.json();
  
      if (!data.id) {
        return NextResponse.json(
          { ok: false, error: "Не передан id протокола" },
          { status: 400 }
        );
      }
  
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
  
      await prisma.agendaItem.deleteMany({
        where: {
          documentId: data.id,
        },
      });
  
      const document = await prisma.document.update({
        where: {
          id: data.id,
        },
        data: {
          title: `Протокол общего собрания ПО ${data.poNumber || ""}`.trim(),
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
        { ok: false, error: "Ошибка обновления протокола" },
        { status: 500 }
      );
    }
  }