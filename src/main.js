import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import savinglifeAbi from "../contract/savinglife.abi.json"

const ContractAddress = "0x2708512A72ffe693F3b6D4a4c552eCAB1a8245d7";
let kit
let contract
let campaigns = []

const connectCeloWallet = async function () {
    if (window.celo) {
        notification("⚠️ Please approve this DApp to use it.")
        try {
            await window.celo.enable()
            notificationOff()

            const web3 = new Web3(window.celo)
            kit = newKitFromWeb3(web3)

            const accounts = await kit.web3.eth.getAccounts()
            kit.defaultAccount = accounts[0]

            contract = new kit.web3.eth.Contract(savinglifeAbi, ContractAddress)
        } catch (error) {
            notification(`⚠️ ${error}.`)
        }
    } else {
        notification("⚠️ Please install the CeloExtensionWallet.")
    }
}

const getBalance = async function () {
    const balance = await kit.web3.eth.getBalance(kit.defaultAccount)
    const celoBalance = parseFloat(kit.web3.utils.fromWei(balance)).toFixed(2);
    document.querySelector("#balance").textContent = celoBalance
}

const getCampaigns = async function () {
    const _total = await contract.methods.totalCampaign().call()
    const _campaigns = []
    for (let i = 0; i < _total; i++) {
        let _campaign = new Promise(async (resolve, reject) => {
            let p = await contract.methods.getCampaign(i).call()
            resolve({
                id: Number(p[0]),
                creator: p[1],
                created_at: p[2],
                title: p[3],
                description: p[4],
                image: p[5],
                amount: parseFloat(kit.web3.utils.fromWei(p[6])).toFixed(2),
                contributors: Number(p[7]),
                raised: parseFloat(kit.web3.utils.fromWei(p[8])).toFixed(2),
                ended: p[9],
            })
        })
        _campaigns.push(_campaign)
    }
    campaigns = await Promise.all(_campaigns)
    renderCampaigns()
}

function renderCampaigns() {
    document.getElementById("savinglife").innerHTML = ""
    campaigns.forEach((_campaign) => {
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-4"
        newDiv.innerHTML = campaignTemplate(_campaign)
        document.getElementById("savinglife").appendChild(newDiv)
    })
}

function campaignTemplate(_campaign) {
    return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_campaign.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_campaign.contributors} Contributors
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_campaign.creator)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_campaign.title}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_campaign.description}             
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>Target: ${Intl.NumberFormat().format(_campaign.amount)}</span>
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>Raised: ${Intl.NumberFormat().format(_campaign.raised)}</span>
        </p>
        ${_campaign.ended ? "<p class='text-danger'>Campaign has ended</p>" : _campaign.creator == kit.defaultAccount ?
            `<div class="d-grid gap-2">
            <a class="btn btn-lg btn-outline-dark withdrawBtn fs-6 p-3" id="withdraw-${_campaign.id}"
        }>
            Withdraw
            </a>
          </div>` :
            `<input type="number" id="donationAmount-${_campaign.id}" class="form-control mb-2"
                      placeholder="Enter amount to donate" />
            <div class="d-grid gap-2">
              <a class="btn btn-lg btn-outline-dark donateBtn fs-6 p-3" id=${_campaign.id
            }>
                Donate
              </a>
            </div>`
        }
      </div>
    </div>
  `
}

function identiconTemplate(_address) {
    const icon = blockies
        .create({
            seed: _address,
            size: 8,
            scale: 16,
        })
        .toDataURL()

    return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

function notification(_text) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text
}

function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}

window.addEventListener("load", async () => {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getBalance()
    await getCampaigns()
    notificationOff()
});

document
    .querySelector("#newCampaignBtn")
    .addEventListener("click", async (e) => {
        const params = [
            document.getElementById("newCampaignTitle").value,
            document.getElementById("newCampaignDescription").value,
            document.getElementById("newImgUrl").value,
            kit.web3.utils.toWei(document.getElementById("newAmount").value)
        ]
        notification(`⌛ Creating "${params[0]}" campaign...`)

        try {
            const result = await contract.methods
                .createCampaign(...params)
                .send({ from: kit.defaultAccount })
        } catch (error) {
            notification(`⚠️ ${error}.`)
        }
        notification(`🎉 You successfully created "${params[0]}".`)
        getCampaigns()
    })

document.querySelector("#savinglife").addEventListener("click", async (e) => {
    if (e.target.className.includes("donateBtn")) {
        const id = e.target.id
        const amount = document.getElementById(`donationAmount-${id}`).value
        notification(`⌛ Donating to "${campaigns[id].title}"...`)
        try {
            console.log(amount, typeof (amount))
            const result = await contract.methods
                .donate(id)
                .send({ from: kit.defaultAccount, value: kit.web3.utils.toWei(amount.toString()) });
            notification(`🎉 You successfully donated ${amount} CELO to "${campaigns[id].title}".`)
            getCampaigns()
            getBalance()
        } catch (error) {
            console.log(error)
            notification(`⚠️ ${error}.`)
        }
    } else if (e.target.className.includes("withdrawBtn")) {
        const id = e.target.id.slice(9)
        notification(`⌛ Withdrawing from "${campaigns[id].title}"...`)
        try {
            const result = await contract.methods
                .withdraw(id)
                .send({ from: kit.defaultAccount });
            notification(`🎉 You've successfully withdrawn ${campaigns[id].raise} CELO from "${campaigns[id].title}".`)
            await getCampaigns();
            await getBalance();
            notificationOff();
        } catch (error) {
            notification(`⚠️ ${error}.`)
        }
    }
})  