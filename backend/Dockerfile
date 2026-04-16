FROM ollama/ollama

RUN apt-get update && apt-get install -y python3 python3-pip curl && rm -rf /var/lib/apt/lists/*

ENV OLLAMA_MODELS=/tmp/ollama

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY . .
RUN mkdir -p uploads

EXPOSE 7860

COPY start.sh /start.sh
RUN chmod +x /start.sh
ENTRYPOINT []
CMD ["/start.sh"]
