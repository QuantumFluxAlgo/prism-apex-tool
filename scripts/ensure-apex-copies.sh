#!/usr/bin/env bash
set -euo pipefail
f="Dockerfile"
tmp="$(mktemp)"

# Insert (idempotently) into the runtime stage, right after:
#   COPY --from=builder /runtime/ .
# the following lines:
#   COPY --from=builder /work/apex /app/apex
#   COPY --from=builder /work/apex /configs
perl -0777 -pe '
  my $orig = $_;
  s{(^\s*COPY --from=builder /runtime/ \.\s*$)}{
    my $inject = $1;
    $inject .= "\nCOPY --from=builder /work/apex /app/apex" unless $orig =~ m{^\s*COPY --from=builder /work/apex /app/apex\s*$}m;
    $inject .= "\nCOPY --from=builder /work/apex /configs"   unless $orig =~ m{^\s*COPY --from=builder /work/apex /configs\s*$}m;
    $inject;
  }me;
  print $_;
' "$f" > "$tmp"

mv "$tmp" "$f"
echo "Dockerfile updated (idempotent)."
