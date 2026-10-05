/**
 * Geometría del símbolo SIP (de marca-sip/logos/svg/sip-simbolo-color.svg).
 * Se exporta por letra porque el sistema visual reutiliza piezas:
 * el trazo de la S y la P conecta cosas; la I inclinada define el corte a 6°.
 */
export const LOGO_VIEWBOX = "50 260 900 310";

export const LOGO_PATHS = {
  s: "M 430 270 H 170 C 120 270 84 305 84 357 C 84 409 120 445 169 445 H 333 C 354 445 368 458 368 479 C 368 499 354 512 333 512 H 97 C 75 512 62 530 61 560 H 333 C 383 560 417 525 417 478 C 417 431 383 397 334 397 H 169 C 147 397 134 381 134 357 C 134 334 149 319 170 319 H 393 C 418 319 430 300 430 270 Z",
  i: "M 551 270 L 523 539 Q 523 541 520 542 L 461 560 L 485 316 Q 485 312 489 309 Z",
  p: "M 617 270 H 838 C 892 270 932 307 932 358 C 932 411 894 446 842 446 H 651 C 641 446 636 453 635 465 L 626 560 H 574 L 585 458 C 589 420 614 397 652 397 H 838 C 864 397 881 381 881 358 C 881 334 864 319 839 319 H 612 Z",
} as const;
