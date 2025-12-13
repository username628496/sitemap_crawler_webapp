# 🧭 SpeedyIndex API v2 Documentation

**Base URL:** `https://api.speedyindex.com`

---

## 🔑 Authentication

Tất cả request đều yêu cầu header:

```
Authorization: <API KEY>
```

---

## 📊 Get Account Balance

**Endpoint:**
`GET /v2/account`

**Response fields:**

* `balance.indexer`: số dư cho dịch vụ Google Link Indexing
* `balance.checker`: số dư cho dịch vụ kiểm tra index

**Example:**

```bash
curl -H "Authorization: <API KEY>" \
https://api.speedyindex.com/v2/account
```

**Example response:**

```json
{
  "code": 0,
  "balance": {
    "indexer": 10014495,
    "checker": 100732
  }
}
```

---

## 🚀 Create a Task

**Endpoint:**
`POST /v2/task/<SEARCH_ENGINE>/<TASK_TYPE>/create`

**Parameters:**

* `SEARCH_ENGINE`: `google` | `yandex`
* `TASK_TYPE`: `indexer` | `checker`
* `title` *(optional)*: tên task
* `urls`: mảng các URL (tối đa 10,000 URL mỗi request)

**Example:**

```bash
curl -X POST -H "Authorization: <API KEY>" \
-H "Content-Type: application/json" \
-d '{"title":"test title","urls":["https://google.com","https://google.ru"]}' \
https://api.speedyindex.com/v2/task/google/indexer/create
```

**Response:**

```json
{
  "code": 0,
  "task_id": "6609d023a3188540f09fec6c",
  "type": "google/indexer"
}
```

**Code meaning:**

* `0`: thành công
* `1`: cần nạp thêm tiền
* `2`: server quá tải, thử lại sau

---

## 📋 Get Task List

**Endpoint:**
`GET /v2/task/<SEARCH_ENGINE>/list/<PAGE>`

**Notes:**

* `PAGE`: số trang (bắt đầu từ 0)
* Mỗi trang chứa tối đa 1000 task
* Sắp xếp từ mới đến cũ

**Example:**

```bash
curl -H "Authorization: <API KEY>" \
https://api.speedyindex.com/v2/task/google/checker/list/0
```

**Response:**

```json
{
  "code": 0,
  "page": 0,
  "last_page": 0,
  "result": [
    {
      "id": "65f8c7315752853b9171860a",
      "size": 690,
      "processed_count": 690,
      "indexed_count": 279,
      "title": "index_.txt",
      "type": "google/checker",
      "created_at": "2024-03-18T22:58:56.901Z"
    }
  ]
}
```

---

## 🔎 Get Task Status

**Endpoint:**
`POST /v2/task/<SEARCH_ENGINE>/<TASK_TYPE>/status`

**Request:**

* `task_ids`: mảng `id` (tối đa 1000)

**Example:**

```bash
curl -X POST -H "Authorization: <API KEY>" \
-H "Content-Type: application/json" \
-d '{"task_ids":["65f8c7305759855b9171860a"]}' \
https://api.speedyindex.com/v2/task/google/indexer/status
```

**Response:**

```json
{
  "code": 0,
  "result": [
    {
      "id": "65f8c7305759855b9171860a",
      "size": 690,
      "processed_count": 690,
      "indexed_count": 279,
      "is_completed": false,
      "title": "index_.txt",
      "type": "google/indexer",
      "created_at": "2024-03-18T22:58:56.901Z"
    }
  ]
}
```

---

## 📥 Download Full Task Report

**Endpoint:**
`POST /v2/task/<SEARCH_ENGINE>/<TASK_TYPE>/fullreport`

**Request:**

* `task_id`: id của task

**Response:**

* `indexed_links`: danh sách link đã được index
* `unindexed_links`: danh sách link chưa được index (có `error_code`)

**Example:**

```bash
curl -X POST -H "Authorization: <API KEY>" \
-H "Content-Type: application/json" \
-d '{"task_id":"67f542b1e86b8c3b8ffac1a6"}' \
https://api.speedyindex.com/v2/task/google/indexer/fullreport
```

**Response:**

```json
{
  "code": 0,
  "result": {
    "id": "67f542b1e86b8c3b8ffac1a6",
    "size": 1,
    "processed_count": 1,
    "indexed_links": [
      {
        "url": "https://google.com",
        "title": "Google"
      }
    ],
    "unindexed_links": [],
    "title": "msg-2025-04-08T15:37:22.838Z.txt",
    "type": "google/indexer",
    "created_at": "2025-04-08T15:37:28.013Z"
  }
}
```

---

## 🔗 Index a Single URL

**Endpoint:**
`POST /v2/<SEARCH_ENGINE>/url`

**Request:**

* `url`: đường dẫn cần index

**Example:**

```bash
curl -X POST -H "Authorization: <API KEY>" \
-H "Content-Type: application/json" \
-d '{"url":"https://google.ru"}' \
https://api.speedyindex.com/v2/google/url
```

**Response:**

```json
{"code":0}
```

---

## 💰 Create Invoice for Payment

**Endpoint:**
`POST /v2/account/invoice/create`

**Request:**

* `qty`: số lượng link cần nạp
* `type`: `indexer` | `checker` | `mix`
* `method`: `crypto` | `paypal` | `yookassa`
* `email`: (bắt buộc với yookassa)

**Example:**

```bash
curl -X POST -H "Authorization: <API KEY>" \
-H "Content-Type: application/json" \
-d '{"qty":10000,"method":"crypto","type":"indexer"}' \
https://api.speedyindex.com/v2/account/invoice/create
```

**Response:**

```json
{
  "code": 0,
  "result": "https://pay.cryptocloud.plus/LJQ18AI1?lang=en"
}
```

---

## ⚡ VIP Queue (Google Indexer Only)

**Endpoint:**
`POST /v2/task/google/indexer/vip`

**Notes:**

* Dành cho task ≤ 100 links
* Googlebot sẽ ghé link trong 1–10 phút
* Hoàn tiền nếu không hoàn thành trong 5 phút
* 1 link = 1 credit bổ sung

**Request:**

* `task_id`: ID của task

**Example:**

```bash
curl -X POST -H "Authorization: <API KEY>" \
-H "Content-Type: application/json" \
-d '{"task_id":"680222ce0428e10a6b16bf72"}' \
https://api.speedyindex.com/v2/task/google/indexer/vip
```

**Response:**

```json
{"code":0,"message":"OK"}
```

**Code meaning:**

* `0`: thành công
* `1`: hết tiền
* `2`: server quá tải, thử lại sau
* `3`: không tìm thấy task
* `4`: task đã vào hàng VIP
* `5`: task có hơn 100 link

---

## 🏁 Tổng kết API SpeedyIndex v2

| Tính năng            | Endpoint                              | Method |
| -------------------- | ------------------------------------- | ------ |
| Xem số dư            | `/v2/account`                         | GET    |
| Tạo task index/check | `/v2/task/<engine>/<type>/create`     | POST   |
| Xem danh sách task   | `/v2/task/<engine>/list/<page>`       | GET    |
| Xem trạng thái task  | `/v2/task/<engine>/<type>/status`     | POST   |
| Tải báo cáo đầy đủ   | `/v2/task/<engine>/<type>/fullreport` | POST   |
| Index 1 URL          | `/v2/<engine>/url`                    | POST   |
| Tạo hóa đơn nạp tiền | `/v2/account/invoice/create`          | POST   |
| Thêm vào VIP Queue   | `/v2/task/google/indexer/vip`         | POST   |

---

📘 **Nguồn gốc:** Trích từ `api_speedyindexbot.pdf`
🕛 **Cập nhật:** 2025-04-08
🔗 **Base:** [https://api.speedyindex.com](https://api.speedyindex.com)
