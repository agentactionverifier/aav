/**
 * verifyReceipt (MVP)
 * ------------------------------------------------------------
 * Documentación / Responsable: Carlos Marrero
 *
 * Objetivo:
 * - Verificar que un Receipt corresponde a una lista de eventos AuditEvent
 *   SIN confiar ciegamente en eventHash/chainHash que vengan “ya puestos”.
 *
 * Qué valida:
 * 1) runId del receipt coincide con los eventos.
 * 2) eventCount del receipt coincide con events.length.
 * 3) Recalcula eventHash y chainHash desde el contenido esencial del evento,
 *    y compara el finalChainHash del receipt con el chainHash final calculado.
 *
 * Importante:
 * - Esto es la base del “evidence trail”. Si alguien altera un evento,
 *   el hash final ya no coincide.
 */

import type { AuditEvent, Receipt } from "@agentactionverifier/protocol/audit";
import {
  AUDIT_CHAIN_GENESIS,
  computeAuditChainHash,
  computeAuditEventHash,
} from "@agentactionverifier/protocol/audit-chain";

/** Resultado estructurado (MVP) para saber por qué falló la verificación. */
export type VerifyReceiptResult =
  | { ok: true }
  | {
      ok: false;
      errors: Array<{
        code:
          | "RUN_ID_MISMATCH"
          | "EVENT_COUNT_MISMATCH"
          | "EVENT_HASH_MISMATCH"
          | "FINAL_HASH_MISMATCH"
          | "SEQUENCE_INVALID"
          | "PREV_CHAIN_HASH_MISMATCH"
          | "CHAIN_HASH_MISMATCH";
        messageKey:
          | "verify.runIdMismatch"
          | "verify.eventCountMismatch"
          | "verify.eventHashMismatch"
          | "verify.finalHashMismatch"
          | "verify.sequenceInvalid"
          | "verify.prevChainHashMismatch"
          | "verify.chainHashMismatch";
        details?: Record<string, unknown>;
      }>;
    };

/**
 * verifyReceipt:
 * - Recalcula hash-chain
 * - Compara contra receipt.finalChainHash
 */
export function verifyReceipt(receipt: Receipt, events: AuditEvent[]): VerifyReceiptResult {
  const errors: VerifyReceiptResult extends { ok: false } ? any[] : any[] = [];

  // 1) Validar conteo de eventos
  if (receipt.eventCount !== events.length) {
    errors.push({
      code: "EVENT_COUNT_MISMATCH",
      messageKey: "verify.eventCountMismatch",
      details: { receiptEventCount: receipt.eventCount, actualEvents: events.length }
    });
  }

  // 2) Validar runId para todos los eventos
  for (const e of events) {
    if (e.runId !== receipt.runId) {
      errors.push({
        code: "RUN_ID_MISMATCH",
        messageKey: "verify.runIdMismatch",
        details: { receiptRunId: receipt.runId, eventRunId: e.runId, eventId: e.id }
      });
      break;
    }
  }

  // 3) Recalcular hash-chain en orden (por seq asc)
  const ordered = [...events].sort((a, b) => a.seq - b.seq);

  let prevChainHash = AUDIT_CHAIN_GENESIS;
  let computedFinalChainHash = prevChainHash;

  for (let index = 0; index < ordered.length; index += 1) {
    const e = ordered[index];
    const expectedSeq = index + 1;
    if (!Number.isSafeInteger(e.seq) || e.seq !== expectedSeq) {
      errors.push({ code: "SEQUENCE_INVALID", messageKey: "verify.sequenceInvalid", details: { eventId: e.id, expectedSeq, actualSeq: e.seq } });
    }
    const computedEventHash = computeAuditEventHash(e);
    const computedChainHash = computeAuditChainHash(prevChainHash, computedEventHash);

    // Si el evento trae eventHash, lo comparamos (opcional, pero útil)
    if ((e as any).eventHash && (e as any).eventHash !== computedEventHash) {
      errors.push({
        code: "EVENT_HASH_MISMATCH",
        messageKey: "verify.eventHashMismatch",
        details: { eventId: e.id, seq: e.seq, provided: (e as any).eventHash, computed: computedEventHash }
      });
    }
    if (e.prevChainHash && e.prevChainHash !== prevChainHash) {
      errors.push({ code: "PREV_CHAIN_HASH_MISMATCH", messageKey: "verify.prevChainHashMismatch", details: { eventId: e.id, seq: e.seq, provided: e.prevChainHash, computed: prevChainHash } });
    }
    if (e.chainHash && e.chainHash !== computedChainHash) {
      errors.push({ code: "CHAIN_HASH_MISMATCH", messageKey: "verify.chainHashMismatch", details: { eventId: e.id, seq: e.seq, provided: e.chainHash, computed: computedChainHash } });
    }

    // Avanza la cadena
    prevChainHash = computedChainHash;
    computedFinalChainHash = computedChainHash;
  }

  // 4) Validar hash final contra receipt
  if (receipt.finalChainHash !== computedFinalChainHash) {
    errors.push({
      code: "FINAL_HASH_MISMATCH",
      messageKey: "verify.finalHashMismatch",
      details: { receiptFinal: receipt.finalChainHash, computedFinal: computedFinalChainHash }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}
