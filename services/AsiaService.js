import axios from 'axios'

class AsiaService {
    constructor() {
        this.baseURL = 'https://us-central1-asia-edu-chernobyl.cloudfunctions.net'
    }

    async loginWithGoogle(idToken) {
        let response = await axios({
            method: 'post',
            baseURL: this.baseURL,
            url: '/user_authen',
            data: {
              idToken
            }
          });
        return response
    }
}

export default new AsiaService()