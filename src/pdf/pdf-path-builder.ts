import {
    appendBezierCurve,
    closePath,
    lineTo,
    moveTo,
    type PDFOperator,
  } from 'pdf-lib';
  import type { SkiaPathCommand } from '../types/skia-types';
  
  const ELLIPSE_KAPPA = 0.5522847498;
  
  export function buildPathOperators(commands: SkiaPathCommand[]): PDFOperator[] {
    const operators: PDFOperator[] = [];
  
    for (const command of commands) {
      switch (command.type) {
        case 'moveTo':
          operators.push(moveTo(command.args[0], command.args[1]));
          break;
        case 'lineTo':
          operators.push(lineTo(command.args[0], command.args[1]));
          break;
        case 'rect': {
          const [x, y, width, height] = command.args;
          operators.push(
            moveTo(x, y),
            lineTo(x + width, y),
            lineTo(x + width, y + height),
            lineTo(x, y + height),
            closePath()
          );
          break;
        }
        case 'ellipse': {
          const [cx, cy, rx, ry] = command.args;
          const ox = rx * ELLIPSE_KAPPA;
          const oy = ry * ELLIPSE_KAPPA;
          operators.push(
            moveTo(cx - rx, cy),
            appendBezierCurve(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry),
            appendBezierCurve(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy),
            appendBezierCurve(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry),
            appendBezierCurve(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy),
            closePath()
          );
          break;
        }
        case 'close':
          operators.push(closePath());
          break;
      }
    }
  
    return operators;
  }