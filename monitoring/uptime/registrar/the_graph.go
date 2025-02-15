package registrar

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"peer_health/httputil"
	"strings"
	"time"
)

func NewGraphStaging() PeerProvider {
	endpoint := `https://api.thegraph.com/subgraphs/name/audius-infra/audius-network-goerli`
	return &graphProvider{endpoint}
}

func NewGraphProd() PeerProvider {
	endpoint := `https://api.thegraph.com/subgraphs/name/audius-infra/audius-network-mainnet`
	return &graphProvider{endpoint}
}

type graphProvider struct {
	endpoint string
}

func (p *graphProvider) Peers(nodeType string) ([]Peer, error) {
	return p.query(nodeType)
}

func (p *graphProvider) query(nodeType string) ([]Peer, error) {

	result := []Peer{}

	gql := `
	query ServiceProviders($type: String, $skip: Int) {
		serviceNodes(where: {isRegistered: true, type: $type}, orderBy: spId, skip: $skip) {
			endpoint
			delegateOwnerWallet
		}
	}
	`

	for {
		variables := map[string]interface{}{
			"skip": len(result),
		}
		if nodeType != "all" {
			variables["type"] = fmt.Sprintf("%s-node", nodeType)
		}
		input := map[string]interface{}{
			"query":     gql,
			"variables": variables,
		}

		output := struct {
			Data struct {
				ServiceNodes []struct {
					Endpoint            string `json:"endpoint"`
					DelegateOwnerWallet string `json:"delegateOwnerWallet"`
				}
			}
		}{}

		err := postJson(p.endpoint, input, &output)
		if err != nil {
			return nil, err
		}

		if len(output.Data.ServiceNodes) == 0 {
			break
		}

		for _, node := range output.Data.ServiceNodes {
			result = append(result, Peer{
				Host:   httputil.RemoveTrailingSlash(strings.ToLower(node.Endpoint)),
				Wallet: node.DelegateOwnerWallet,
			})
		}

	}

	return result, nil
}

var httpClient = &http.Client{
	Timeout: time.Minute,
}

func postJson(endpoint string, body interface{}, dest interface{}) error {
	buf, err := json.Marshal(body)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(endpoint, "application/json", bytes.NewReader(buf))
	if err != nil {
		return err
	}

	if resp.StatusCode != 200 {
		txt, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("postJson: %d %s %s", resp.StatusCode, endpoint, txt)
	}

	dec := json.NewDecoder(resp.Body)
	return dec.Decode(&dest)
}
