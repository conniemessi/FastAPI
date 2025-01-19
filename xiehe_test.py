from openai import OpenAI

# Configure client
client = OpenAI(
    api_key="gzw@123",
    base_url="http://10.200.213.30:1025/v1",
    timeout=30.0  # Added timeout of 5 minutes
)

try:
    # Test completion
    completion = client.chat.completions.create(
        model="taichu",
        messages=[
            {"role": "user", "content": "你好，1+1等于多少？"}
        ],
        temperature=1,
    )

    # Print the response
    print("Response:", completion.choices[0].message.content)

except Exception as e:
    print("Error occurred:", str(e)) 