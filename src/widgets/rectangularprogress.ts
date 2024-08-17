import { register, type BaseProps, type Widget } from './widget.js';
import Gtk from 'gi://Gtk?version=3.0';
import PangoCairo from 'gi://PangoCairo?version=1.0'
import Pango from 'gi://Pango'

interface textExtents {
  xBearing: number
  yBearing: number
  width: number
  height: number
  xAdvance: number
  yAdvance: number

}

interface Context {
  setSourceRGBA: (r: number, g: number, b: number, a: number) => void
  arc: (x: number, y: number, r: number, a1: number, a2: number) => void
  setLineWidth: (w: number) => void
  lineTo: (x: number, y: number) => void
  stroke: () => void
  fill: () => void
  moveTo: (x: number, y: number) => void
  textExtents: (s: string) => textExtents,
  showText: (s: string) => void
  $dispose: () => void
}

export type RectangularProgressProps<
  Child extends Gtk.Widget = Gtk.Widget,
  Attr = unknown,
  Self = RectangularProgress<Child, Attr>
> = BaseProps<Self, Gtk.Bin.ConstructorProperties & {
  child?: Child
  rounded?: boolean
  value?: number
  inverted?: boolean
  start_at?: number
  end_at?: number
  text?: string
}, Attr>

export function newRectangularProgress<
  Child extends Gtk.Widget = Gtk.Widget,
  Attr = unknown,
>(...props: ConstructorParameters<typeof RectangularProgress<Child, Attr>>) {
  return new RectangularProgress(...props);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface RectangularProgress<Child, Attr> extends Widget<Attr> { }
export class RectangularProgress<
  Child extends Gtk.Widget,
  Attr = unknown,
> extends Gtk.Bin {
  static {
    register(this, {
      cssName: 'rectangular-progress',
      properties: {
        'start-at': ['float', 'rw'],
        'end-at': ['float', 'rw'],
        'value': ['float', 'rw'],
        'inverted': ['boolean', 'rw'],
        'rounded': ['boolean', 'rw'],
        'text': ['string', 'rw'],
      },
    });
  }

  constructor(props: RectangularProgressProps<Child, Attr> = {}, child?: Child) {
    if (child)
      props.child = child;

    super(props as Gtk.Bin.ConstructorProperties);
  }

  get child() { return super.child as Child; }
  set child(child: Child) { super.child = child; }

  get rounded() { return this._get('rounded') || false; }
  set rounded(r: boolean) {
    if (this.rounded === r)
      return;

    this._set('rounded', r);
    this.queue_draw();
  }

  get text() { return this._get('text') || ""; }
  set text(r: string) {
    if (this.text === r)
      return;

    this._set('text', r);
    this.queue_draw();
  }

  get inverted() { return this._get('inverted') || false; }
  set inverted(inverted: boolean) {
    if (this.inverted === inverted)
      return;

    this._set('inverted', inverted);
    this.queue_draw();
  }

  get start_at() { return this._get('start-at') || 0; }
  set start_at(value: number) {
    if (this.start_at === value)
      return;

    if (value > 1)
      value = 1;

    if (value < 0)
      value = 0;

    this._set('start-at', value);
    this.queue_draw();
  }

  get end_at() { return this._get('end-at') || this.start_at; }
  set end_at(value: number) {
    if (this.end_at === value)
      return;

    if (value > 1)
      value = 1;

    if (value < 0)
      value = 0;

    this._set('end-at', value);
    this.queue_draw();
  }

  get value() { return this._get('value') || 0; }
  set value(value: number) {
    if (this.value === value)
      return;

    if (value > 1)
      value = 1;

    if (value < 0)
      value = 0;


    this._set('value', value);
    this.queue_draw();
  }

  vfunc_get_preferred_height(): [number, number] {
    let minHeight = this.get_style_context()
      .get_property('min-height', Gtk.StateFlags.NORMAL) as number;
    if (minHeight <= 0)
      minHeight = 40;

    return [minHeight, minHeight];
  }

  vfunc_get_preferred_width(): [number, number] {
    let minWidth = this.get_style_context()
      .get_property('min-width', Gtk.StateFlags.NORMAL) as number;
    if (minWidth <= 0)
      minWidth = 40;

    return [minWidth, minWidth];
  }

  private _toRadian(percentage: number) {
    percentage = Math.floor(percentage * 100);
    return (percentage / 100) * (2 * Math.PI);
  }


  private _isFullCircle(start: number, end: number, epsilon = 1e-10): boolean {
    // Ensure that start and end are between 0 and 1
    start = (start % 1 + 1) % 1;
    end = (end % 1 + 1) % 1;

    // Check if the difference between start and end is close to 1
    return Math.abs(start - end) <= epsilon;
  }

  private _scaleArcValue(start: number, end: number, value: number): number {
    // Ensure that start and end are between 0 and 1
    start = (start % 1 + 1) % 1;
    end = (end % 1 + 1) % 1;

    // Calculate the length of the arc
    let arcLength = end - start;
    if (arcLength < 0)
      arcLength += 1; // Adjust for circular representation

    // Calculate the scaled value on the arc based on the arcLength
    let scaled = arcLength * value;

    // Ensure the scaled value is between 0 and 1
    scaled = (scaled % 1 + 1) % 1;

    return scaled;
  }

  private _drawText(cr: Context, x: number, y: number, w: number, h: number, font: Pango.FontDescription, text: string): void {
    let layout = PangoCairo.create_layout(cr);
    layout.set_font_description(font);
    layout.set_text(text, -1);

    // Get the text size
    let [textWidth, textHeight] = layout.get_size();
    textWidth /= Pango.SCALE;
    textHeight /= Pango.SCALE;

    // Calculate the position to center the text
    let textX = x + (w - textWidth) / 2;
    let textY = y + (h - textHeight) / 2;

    // Move to the calculated position and show the text
    cr.moveTo(textX, textY);
    PangoCairo.show_layout(cr, layout);
  }

  private _drawRectangularProgress(cr: Context, x: number, y: number, w: number, h: number, radius: number, thickness: number, progress: number,): void {
    let perimeter =
      2 * (w + h) -
      8 * radius +
      2 * Math.PI * radius; // Total path length
    let progressLength = progress * perimeter; // Length to draw based on progress
    cr.setLineWidth(thickness);

    // Start at top-center
    cr.moveTo(x + w / 2, y + thickness / 2);

    // Top-right edge and corner
    if (progressLength > 0) {
      let topLength = w / 2 - radius;
      if (progressLength <= topLength) {
        cr.lineTo(x + w / 2 + progressLength, y + thickness / 2);
        cr.stroke();
        return;
      } else {
        cr.lineTo(x + w - radius, y + thickness / 2);
        progressLength -= topLength;
      }
    }

    // Top-right corner arc
    if (progressLength > 0) {
      let arcLength = 0.5 * Math.PI * radius;
      if (progressLength <= arcLength) {
        let angle =
          -0.5 * Math.PI + (progressLength / arcLength) * (0.5 * Math.PI);
        cr.arc(
          x + w - radius - thickness / 2,
          y + radius + thickness / 2,
          radius,
          -0.5 * Math.PI,
          angle,
        );
        cr.stroke();
        return;
      } else {
        cr.arc(
          x + w - radius - thickness / 2,
          y + radius + thickness / 2,
          radius,
          -0.5 * Math.PI,
          0,
        );
        progressLength -= arcLength;
      }
    }

    // Right edge
    if (progressLength > 0) {
      let rightLength = h - 2 * radius;
      if (progressLength <= rightLength) {
        cr.lineTo(
          x + w - thickness / 2,
          y + radius + progressLength,
        );
        cr.stroke();
        return;
      } else {
        cr.lineTo(x + w - thickness / 2, y + h - radius);
        progressLength -= rightLength;
      }
    }

    // Bottom-right corner arc
    if (progressLength > 0) {
      let arcLength = 0.5 * Math.PI * radius;
      let angle = (progressLength / arcLength) * (0.5 * Math.PI);
      cr.arc(
        x + w - radius - thickness / 2,
        y + h - radius - thickness / 2,
        radius,
        0,
        progressLength <= arcLength ? angle : 0.5 * Math.PI
      );
      if (progressLength <= arcLength) {
        cr.stroke();
        return;
      }
    }

    // Bottom edge
    if (progressLength > 0) {
      let bottomLength = w - 2 * radius;
      if (progressLength <= bottomLength) {
        cr.lineTo(
          x + w - radius - progressLength,
          y + h - thickness / 2,
        );
        cr.stroke();
        return;
      } else {
        cr.lineTo(x + radius, y + h - thickness / 2);
        progressLength -= bottomLength;
      }
    }

    // Bottom-left corner arc
    if (progressLength > 0) {
      let arcLength = 0.5 * Math.PI * radius;
      if (progressLength <= arcLength) {
        let angle =
          0.5 * Math.PI + (progressLength / arcLength) * (0.5 * Math.PI);
        cr.arc(
          x + radius + thickness / 2,
          y + h - radius - thickness / 2,
          radius,
          0.5 * Math.PI,
          angle,
        );
        cr.stroke();
        return;
      } else {
        cr.arc(
          x + radius + thickness / 2,
          y + h - radius - thickness / 2,
          radius,
          0.5 * Math.PI,
          Math.PI,
        );
        progressLength -= arcLength;
      }
    }

    // Left edge
    if (progressLength > 0) {
      let leftLength = h - 2 * radius;
      if (progressLength <= leftLength) {
        cr.lineTo(
          x + thickness / 2,
          y + h - radius - progressLength,
        );
        cr.stroke();
        return;
      } else {
        cr.lineTo(x + thickness / 2, y + radius);
        progressLength -= leftLength;
      }
    }

    // Top-left corner arc
    if (progressLength > 0) {
      let arcLength = 0.5 * Math.PI * radius;
      if (progressLength <= arcLength) {
        let angle =
          Math.PI + (progressLength / arcLength) * (0.5 * Math.PI);
        cr.arc(
          x + radius + thickness / 2,
          y + radius + thickness / 2,
          radius,
          Math.PI,
          angle,
        );
        cr.stroke();
        return;
      } else {
        cr.arc(
          x + radius + thickness / 2,
          y + radius + thickness / 2,
          radius,
          Math.PI,
          1.5 * Math.PI,
        );
        cr.stroke()
        progressLength -= arcLength;
      }
    }

    // Top edge to center
    if (progressLength > 0) {
      cr.moveTo(x + radius, y + thickness / 2)
      cr.lineTo(x + radius + progressLength, y + thickness / 2);
      cr.stroke();
    }
  }


  vfunc_draw(cr: Context): boolean {
    const allocation = this.get_allocation();
    const styles = this.get_style_context();
    const width = allocation.width;
    const height = allocation.height;
    const border = styles.get_border(Gtk.StateFlags.NORMAL);
    const thickness = border.top;
    const fg = styles.get_color(Gtk.StateFlags.NORMAL);
    const font = styles.get_font(Gtk.StateFlags.NORMAL);

    const x = 0
    const y = 0

    cr.setSourceRGBA(1, 1, 1, 1);

    const cornerRadius = styles.get_property('border-radius', Gtk.StateFlags.NORMAL) as number
    this._drawRectangularProgress(cr, x, y, width, height, cornerRadius, thickness, this.value)

    cr.setSourceRGBA(fg.red, fg.green, fg.blue, fg.alpha);
    this._drawText(cr, x, y, width, height, font, this.text)

    if (this.child) {
      this.child.size_allocate(allocation);
      this.propagate_draw(this.child, cr);
    }

    cr.$dispose();
    return true;
  }
}

export default RectangularProgress;
