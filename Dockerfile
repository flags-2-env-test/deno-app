FROM denoland/deno:debian@sha256:b429777c3dcff34a6488f365a1537db1640b2d48379b60f5e6206be034472463

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential make \
 && rm -rf /var/lib/apt/lists/*

COPY .vendor/.zed/oresoftware/flags-2-env ./.vendor/.zed/oresoftware/flags-2-env
RUN make -C .vendor/.zed/oresoftware/flags-2-env clean && make -C .vendor/.zed/oresoftware/flags-2-env shared

COPY .cli-flags.toml ./
COPY src ./src

# DENO_DIR has to be writable by the runtime user, so it is created and handed
# over here rather than left to Deno to create under a root-owned HOME.
ENV DENO_DIR=/tmp/deno
RUN mkdir -p /tmp/deno

RUN useradd --create-home --shell /bin/sh --uid 10001 fixture
RUN chown -R fixture:fixture /tmp/deno
USER fixture

# --allow-ffi is unscoped on purpose. Path-scoping it to the one library is
# enough for Deno.dlopen, but the client then reads the returned char* through
# Deno.UnsafePointerView, and pointer reads are checked against the *unscoped*
# ffi permission -- a scoped grant fails at getCString with NotCapable, several
# frames away from the dlopen it looks like it should cover.
#
# --allow-read stays narrowed to the directory holding .cli-flags.toml.
CMD ["deno", "run", \
     "--allow-ffi", \
     "--allow-read=/app", \
     "src/demo.ts"]
