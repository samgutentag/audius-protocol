package server

import (
	"bytes"
	"mediorum/cidutil"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestRepair(t *testing.T) {
	replicationFactor := 5
	crudrWait := time.Millisecond * 300

	runTestNetworkRepair := func(cleanup bool) {
		wg := sync.WaitGroup{}
		wg.Add(len(testNetwork))
		for _, s := range testNetwork {
			s := s
			go func() {
				err := s.runRepair(cleanup)
				assert.NoError(t, err)
				wg.Done()
			}()
		}
		wg.Wait()
	}

	ss := testNetwork[0]

	// first, write a blob only to my storage
	data := []byte("repair test")
	cid, err := cidutil.ComputeFileCID(bytes.NewReader(data))
	assert.NoError(t, err)
	err = ss.replicateToMyBucket(cid, bytes.NewReader(data))
	assert.NoError(t, err)

	time.Sleep(crudrWait)

	// assert it only exists on 1 host
	{
		blobs := []Blob{}
		ss.crud.DB.Where(Blob{Key: cid}).Find(&blobs)
		assert.Len(t, blobs, 1)
	}

	// tell all servers do repair
	runTestNetworkRepair(false)

	// wait for crud replication
	time.Sleep(crudrWait)

	// assert it exists on R hosts
	{
		blobs := []Blob{}
		ss.crud.DB.Where(Blob{Key: cid}).Find(&blobs)
		assert.Len(t, blobs, replicationFactor)
	}

	// --------------------------
	//
	// now over-replicate file
	//
	for _, server := range testNetwork {
		ss.replicateFileToHost(server.Config.Self.Host, cid, bytes.NewReader(data))
	}

	// wait for crud
	time.Sleep(crudrWait)

	// assert over-replicated
	{
		blobs := []Blob{}
		ss.crud.DB.Where(Blob{Key: cid}).Find(&blobs)
		assert.True(t, len(blobs) == len(testNetwork))
	}

	// tell all servers do cleanup
	runTestNetworkRepair(true)

	// wait for crud replication
	time.Sleep(crudrWait)

	// assert R copies
	{
		blobs := []Blob{}
		ss.crud.DB.Where(Blob{Key: cid}).Find(&blobs)
		assert.Equal(t, replicationFactor, len(blobs))
	}

	// ----------------------
	// now make one of the servers "loose" a file
	{
		byHost := map[string]*MediorumServer{}
		for _, s := range testNetwork {
			byHost[s.Config.Self.Host] = s
		}

		rendezvousOrder := []*MediorumServer{}
		preferred, _ := ss.rendezvous(cid)
		for _, h := range preferred {
			rendezvousOrder = append(rendezvousOrder, byHost[h])
		}

		// make leader lose file
		leader := rendezvousOrder[0]
		leader.dropFromMyBucket(cid)

		// normally a standby server wouldn't pull this file
		standby := rendezvousOrder[replicationFactor+2]
		err = standby.runRepair(false)
		assert.NoError(t, err)
		assert.False(t, standby.hostHasBlob(standby.Config.Self.Host, cid))

		// running repair in cleanup mode... standby will observe that #1 doesn't have blob so will pull it
		err = standby.runRepair(true)
		assert.NoError(t, err)
		assert.True(t, standby.hostHasBlob(standby.Config.Self.Host, cid))

		// leader re-gets lost file when repair runs
		err = leader.runRepair(false)
		assert.NoError(t, err)
		assert.True(t, leader.hostHasBlob(leader.Config.Self.Host, cid))

		// standby drops file after leader has it back
		err = standby.runRepair(true)
		assert.NoError(t, err)
		assert.False(t, standby.hostHasBlob(standby.Config.Self.Host, cid))
	}

}
