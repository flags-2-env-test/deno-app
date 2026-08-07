FROM denoland/deno:debian

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential make \
 && rm -rf /var/lib/apt/lists/*

COPY .vendor/.zed/oresoftware/flags-2-env ./.vendor/.zed/oresoftware/flags-2-env
RUN make -C .vendor/.zed/oresoftware/flags-2-env clean && make -C .vendor/.zed/oresoftware/flags-2-env shared

COPY .cli-flags.toml ./
COPY src ./src

ENV DENO_DIR=/tmp/deno

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
