"""Patch speechbrain's LazyModule so it plays nicely with Python 3.13 + torch.

Bug:
    On Py 3.13, torch's internal `register_fake` calls `inspect.getmodule()` on
    every module in `sys.modules`. `getmodule` probes with `hasattr(m, '__file__')`.
    speechbrain's LazyModule.__getattr__ eagerly imports the target on any
    attribute access; if the target is an uninstalled optional integration
    (e.g. `speechbrain.integrations.k2_fsa`), it raises ImportError, which
    `hasattr` won't swallow (only AttributeError is caught), so the torch op
    registration blows up.

Fix:
    Make LazyModule's __getattr__ raise AttributeError instead of ImportError
    for attribute probes. Actual "use the module" calls still work the same
    (they access a specific non-dunder attribute, which re-triggers import).

Safe to import multiple times; idempotent.
"""

from __future__ import annotations


def _patch() -> None:
    try:
        from speechbrain.utils.importutils import LazyModule
    except Exception:
        return  # speechbrain not installed; nothing to patch

    if getattr(LazyModule, "_vanta_patched", False):
        return

    orig_getattr = LazyModule.__getattr__

    def safe_getattr(self, attr):
        try:
            return orig_getattr(self, attr)
        except ImportError as e:
            # Translate to AttributeError so hasattr()/inspect probes behave.
            raise AttributeError(str(e)) from e

    LazyModule.__getattr__ = safe_getattr
    LazyModule._vanta_patched = True


_patch()
