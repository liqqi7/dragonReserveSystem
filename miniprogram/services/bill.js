const { request } = require("./request");

function listBills() {
  return request({ url: "/bills" });
}

function createBill(payload) {
  return request({
    url: "/bills",
    method: "POST",
    data: payload
  });
}

function updateBill(billId, payload) {
  return request({
    url: `/bills/${billId}`,
    method: "PATCH",
    data: payload
  });
}

function deleteBill(billId) {
  return request({
    url: `/bills/${billId}`,
    method: "DELETE"
  });
}

module.exports = {
  listBills,
  createBill,
  updateBill,
  deleteBill
};
