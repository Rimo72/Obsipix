import type { Document } from '@core/document/Document';
import type { FrameId, LayerId } from '@core/types/ids';

/** What a command touched, so events / the renderer can invalidate precisely. */
export interface CommandResult {
  readonly affectedLayerIds?: readonly LayerId[];
  readonly affectedFrameIds?: readonly FrameId[];
}

export interface CommandContext {
  readonly document: Document;
}

/**
 * The single unit of persistent document mutation (PROJECT_CORE §10).
 *
 * A command only needs to *apply* its change; reversal is handled by the
 * {@link History} via state snapshots. `execute` throwing aborts the change and
 * triggers a rollback.
 */
export interface Command {
  /** Human-readable description for the history UI. */
  readonly label: string;
  execute(context: CommandContext): CommandResult;
}

/** Build a command from a plain mutation. Use when there is no affected-object info to report. */
export function mutation(label: string, run: (document: Document) => void): Command {
  return {
    label,
    execute(context): CommandResult {
      run(context.document);
      return {};
    },
  };
}

/** Build a command that also reports which layers / frames it affected. */
export function command(label: string, run: (document: Document) => CommandResult): Command {
  return {
    label,
    execute(context): CommandResult {
      return run(context.document);
    },
  };
}
